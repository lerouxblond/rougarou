import type { NarratorView, PlayerView, VoteOutcome } from '@rougarou/protocol';
import { VoteBoard, type VoteEntry } from '@rougarou/ui';
import type { TFunction } from 'i18next';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

type View = PlayerView | NarratorView;

/** Cle de « Epargner » dans un decompte (`R-36`). */
const SPARE = '@spare';

/**
 * Le vote en cours, du village ou du Maire (US-49, US-52). Pendant le vote,
 * chaque candidat montre ceux qui ont vote pour lui ; a la cloture, le
 * decompte pondere du serveur (voix double du Maire) remplace ce compte. Le
 * client ne decide de rien : l'issue vient du serveur.
 */
export function VotePanel({ view }: { readonly view: View }) {
  const { t, i18n } = useTranslation();
  const name = (id: string) => view.players.find((player) => player.id === id)?.name ?? id;
  const secret = view.options.voteVisibility === 'secret' && view.kind === 'player';
  const alive = view.players.filter((player) => player.alive).length;

  const box = ballotBox(view);

  if (view.election?.stage === 'candidacy') {
    return <Candidacies candidates={view.election.candidates} name={name} />;
  }

  if (box === null) {
    return null;
  }

  const { keys, ballots, tally } = box;
  const message = voteMessage(view, name, t, i18n.language);
  const entries: VoteEntry[] = keys.map((key) => {
    const voters = ballots.filter(([, target]) => target === key).map(([voter]) => name(voter));

    return {
      id: key,
      label: key === SPARE ? t('actions.spare') : name(key),
      votes: tally?.[key] ?? voters.length,
      voters,
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <VoteBoard
        label={t('vote.board')}
        entries={entries}
        visibility={secret ? 'secret' : 'public'}
        progress={
          secret ? t('vote.secret') : t('vote.progress', { count: ballots.length, total: alive })
        }
        votesLabel={(votes) => t('vote.votes', { count: votes })}
      />
      {message === null ? null : (
        <p role="status" className="font-display text-2xl text-text">
          {message}
        </p>
      )}
    </div>
  );
}

interface BallotBox {
  /** Les candidats, et « Epargner » s'il est propose. */
  readonly keys: readonly string[];
  /** Qui a vote pour qui (votant, cible). */
  readonly ballots: readonly (readonly [string, string])[];
  /** Le decompte pondere, une fois le vote clos et public. */
  readonly tally: Readonly<Record<string, number>> | null;
}

/** L'urne du vote en cours, du village ou du Maire, telle que la vue la montre. */
function ballotBox(view: View): BallotBox | null {
  const { vote, election } = view;

  if (vote !== null) {
    return {
      keys: [...vote.candidates, ...(vote.spare ? [SPARE] : [])],
      ballots: Object.entries(vote.ballots).flatMap(([voter, ballot]) =>
        ballot.kind === 'player'
          ? [[voter, ballot.playerId] as const]
          : ballot.kind === 'spare'
            ? [[voter, SPARE] as const]
            : [],
      ),
      tally: vote.tally,
    };
  }

  if (election?.stage === 'vote') {
    return { keys: [...election.eligible], ballots: Object.entries(election.ballots), tally: null };
  }

  return null;
}

/** Pourquoi personne n'est execute (`R-36`, `R-38`). */
const NOBODY_KEYS: Record<Extract<VoteOutcome, { kind: 'nobody' }>['reason'], string> = {
  spare: 'vote.outcome.nobody_spare',
  noBallots: 'vote.outcome.nobody_no_ballots',
  tie: 'vote.outcome.nobody_tie',
};

/** L'issue d'un vote, en toutes lettres (aussi pour le journal). */
/** Les candidatures a la mairie, en direct (`R-35`, US-49). */
function Candidacies({
  candidates,
  name,
}: {
  readonly candidates: readonly string[];
  readonly name: (id: string) => string;
}) {
  const { t } = useTranslation();
  const title = useId();

  return (
    <section aria-labelledby={title} className="flex flex-col gap-2 text-text">
      <h2 id={title} className="font-display text-xl">
        {t('vote.candidates')}
      </h2>
      {candidates.length === 0 ? (
        <p className="text-text-muted">{t('vote.no_candidates')}</p>
      ) : (
        <ul aria-labelledby={title} className="flex flex-wrap gap-2">
          {candidates.map((id) => (
            <li key={id} className="rounded-pill border border-border px-3 py-1">
              {name(id)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Ce que le vote du village annonce a tous, du plus recent au plus ancien :
 * la decision du Maire, l'egalite qu'il doit trancher, le second tour, puis
 * l'issue. Tout vient de la vue : le client ne decide de rien (`R-33`).
 */
function voteMessage(
  view: View,
  name: (id: string) => string,
  t: TFunction,
  locale: string,
): string | null {
  const { vote, election } = view;
  const names = (ids: readonly string[]) =>
    new Intl.ListFormat(locale, { type: 'conjunction' }).format(ids.map(name));

  if (vote === null) {
    // Egalite a l'election : second tour entre les ex aequo (`R-35`).
    return election?.stage === 'vote' && election.round === 2
      ? t('vote.outcome.second_round', { names: names(election.eligible) })
      : null;
  }

  if (vote.tieBroken !== null) {
    return vote.tieBroken.playerId === null
      ? t('vote.outcome.mayor_silent')
      : t('vote.outcome.mayor_chose', { name: name(vote.tieBroken.playerId) });
  }

  if (vote.tie !== null) {
    const mayor = view.players.find((player) => player.mayor);
    const self = view.kind === 'player' ? view.me?.id : undefined;

    return mayor !== undefined && mayor.id === self
      ? t('vote.outcome.you_decide', { names: names(vote.tie) })
      : t('vote.outcome.mayor_decides', { names: names(vote.tie), mayor: mayor?.name ?? '' });
  }

  if (vote.round === 2 && !vote.closed) {
    return t('vote.outcome.second_round', { names: names(vote.candidates) });
  }

  return vote.outcome === null ? null : outcomeText(vote.outcome, name, t);
}

export function outcomeText(
  outcome: VoteOutcome,
  name: (id: string) => string,
  t: TFunction,
): string {
  switch (outcome.kind) {
    case 'execute':
      return t('vote.outcome.execute', { name: name(outcome.playerId) });
    case 'nobody':
      return t(NOBODY_KEYS[outcome.reason]);
    case 'tie':
      return t('vote.outcome.tie', { names: outcome.tied.map(name).join(', ') });
  }
}

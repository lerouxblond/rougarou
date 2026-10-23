import type { NarratorView, PlayerView, VoteOutcome } from '@rougarou/protocol';
import { VoteBoard, type VoteEntry } from '@rougarou/ui';
import type { TFunction } from 'i18next';
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
  const { t } = useTranslation();
  const name = (id: string) => view.players.find((player) => player.id === id)?.name ?? id;
  const secret = view.options.voteVisibility === 'secret' && view.kind === 'player';
  const alive = view.players.filter((player) => player.alive).length;

  const box = ballotBox(view);

  if (box === null) {
    return null;
  }

  const { keys, ballots, tally } = box;
  const { vote } = view;
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
      {vote?.outcome == null ? null : (
        <p role="status" className="font-display text-2xl text-text">
          {outcomeText(vote.outcome, name, t)}
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

function outcomeText(outcome: VoteOutcome, name: (id: string) => string, t: TFunction): string {
  switch (outcome.kind) {
    case 'execute':
      return t('vote.outcome.execute', { name: name(outcome.playerId) });
    case 'nobody':
      return t(NOBODY_KEYS[outcome.reason]);
    case 'tie':
      return t('vote.outcome.tie', { names: outcome.tied.map(name).join(', ') });
  }
}

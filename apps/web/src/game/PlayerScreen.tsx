import type { MeResponse, Phase, PlayerView } from '@rougarou/protocol';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionPanel } from './ActionPanel.tsx';
import { DawnNews } from './DawnNews.tsx';
import { PlayerLobby } from './Lobby.tsx';
import { MyInfo } from './MyInfo.tsx';
import { NightPanel } from './NightPanel.tsx';
import { PlayersCircle, PlayersList } from './PlayersPanel.tsx';
import { RoleCard } from './RoleCard.tsx';
import { BottomBar } from './BottomBar.tsx';
import { DealScreen } from './DealScreen.tsx';
import { EndScreen } from './EndScreen.tsx';
import { UniformNight } from './UniformNight.tsx';
import { VotePanel } from './VotePanel.tsx';

type Screen = (view: PlayerView, me: MeResponse, names: ReadonlyMap<string, string>) => ReactNode;

/** Une nuit ou le joueur n'agit pas : l'ecran uniforme (US-40) ; sinon, son etape. */
const night: Screen = (view, _me, names) =>
  view.night === null && view.actions.length === 0 ? (
    <UniformNight />
  ) : (
    <>
      {view.night === null ? null : <NightPanel night={view.night} names={names} />}
      <ActionPanel actions={view.actions} names={names} />
    </>
  );

/** Les autres phases : le resultat, s'il y en a un, puis les actions recues. */
const day: Screen = (view, _me, names) => <DayScreen view={view} names={names} />;

/** La table `phase → ecran` du joueur, sans cascade de `if` (`docs/04` §Client web). */
const SCREENS: Record<Phase, Screen> = {
  LOBBY: (view, me) => <PlayerLobby view={view} displayName={me.displayName} />,
  CONFIG: (view, me) => <PlayerLobby view={view} displayName={me.displayName} />,
  DEAL: (view) => <DealScreen view={view} />,
  PRESENTATIONS: day,
  NIGHT: night,
  DAWN: day,
  MAYOR_ELECTION: day,
  DAY_DEBATE: day,
  DAY_VOTE: day,
  EXECUTION: day,
  ENDED: (view) => <EndScreen view={view} />,
};

function DayScreen({
  view,
  names,
}: {
  readonly view: PlayerView;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();

  return (
    <>
      {view.me?.alive === false ? (
        <p role="status" className="rounded-md border border-danger p-3 text-danger">
          {t('game.you_are_dead')}
        </p>
      ) : null}
      {view.winner === null ? null : (
        <p className="font-display text-2xl text-accent">{t(`winner.${view.winner}`)}</p>
      )}
      <DawnNews view={view} />
      <ActionPanel actions={view.actions} names={names} />
      <VotePanel view={view} />
    </>
  );
}

/**
 * L'ecran du joueur (`docs/06` §Plateformes) : une colonne et une barre basse
 * sur telephone ; le jeu et les joueurs cote a cote sur tablette ; la carte
 * et les infos a gauche, le cercle des joueurs sous le jeu, sur ordinateur.
 */
export function PlayerScreen({ view, me }: { readonly view: PlayerView; readonly me: MeResponse }) {
  const names = new Map(view.players.map((player) => [player.id, player.name]));
  const role = view.me?.role ?? null;
  const seated = view.me !== null && view.phase !== 'LOBBY' && view.phase !== 'CONFIG';

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_15rem] lg:grid-cols-[17rem_1fr]">
      {seated ? (
        <aside className="hidden flex-col gap-4 lg:flex">
          {role === null || view.phase === 'DEAL' ? null : <RoleCard role={role} />}
          <MyInfo knowledge={view.me?.knowledge ?? []} names={names} />
        </aside>
      ) : null}
      <div className="flex flex-col gap-6">
        {SCREENS[view.phase](view, me, names)}
        {seated ? (
          <div className="hidden lg:block">
            <PlayersCircle players={view.players} self={view.me?.id ?? null} />
          </div>
        ) : null}
      </div>
      {seated ? (
        <aside className="hidden sm:block lg:hidden">
          <PlayersList players={view.players} self={view.me?.id ?? null} />
        </aside>
      ) : null}
      {seated ? <BottomBar view={view} names={names} /> : null}
    </div>
  );
}

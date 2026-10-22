import type { Story, StoryDefault } from '@ladle/react';

import { RoleCardArt } from './RoleCardArt.tsx';
import { ROLE_ICON_IDS } from './RoleIcon.tsx';

export default {
  title: 'RoleCardArt',
} satisfies StoryDefault;

/** Les cartes de repli des roles de M3, a passer dans les deux themes. */
export const RolesClassiques: Story = () => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
    {ROLE_ICON_IDS.map((role) => (
      <RoleCardArt
        key={role}
        role={role}
        team={role === 'werewolf' ? 'wolves' : 'village'}
        name={role}
        teamLabel={role === 'werewolf' ? 'Loups' : 'Village'}
      />
    ))}
  </div>
);

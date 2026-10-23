import type { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';

import { Button } from './Button.tsx';
import { Dialog, Sheet } from './Dialog.tsx';
import { Switch } from './Switch.tsx';
import { Tabs } from './Tabs.tsx';
import { Toast, ToastRegion } from './Toast.tsx';

export default {
  title: 'Controles',
} satisfies StoryDefault;

export const Interrupteur: Story = () => {
  const [checked, setChecked] = useState(true);

  return (
    <div className="w-80">
      <Switch
        label="Maire"
        description="Un Maire est élu le premier jour ; sa voix compte double."
        checked={checked}
        onCheckedChange={setChecked}
      />
    </div>
  );
};

export const Onglets: Story = () => (
  <div className="w-80">
    <Tabs
      label="Tableau du meneur"
      items={[
        { value: 'script', label: 'Script', content: <p>Le village s’endort…</p> },
        { value: 'steps', label: 'Étapes', content: <p>Voyante, Loups, Sorcière</p> },
        { value: 'players', label: 'Joueurs', content: <p>8 joueurs</p> },
      ]}
    />
  </div>
);

export const Fenetres: Story = () => {
  const [open, setOpen] = useState<'dialog' | 'sheet' | null>(null);

  return (
    <div className="flex gap-3">
      <Button
        onClick={() => {
          setOpen('dialog');
        }}
      >
        Dialogue
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen('sheet');
        }}
      >
        Panneau bas
      </Button>
      <Dialog
        open={open === 'dialog'}
        onOpenChange={() => {
          setOpen(null);
        }}
        title="Ma carte"
        description="Maintiens pour révéler ton rôle."
        closeLabel="Fermer"
      >
        <p>…</p>
      </Dialog>
      <Sheet
        open={open === 'sheet'}
        onOpenChange={() => {
          setOpen(null);
        }}
        title="Mes infos"
        closeLabel="Fermer"
      >
        <p>Nuit 1 : Bob est Loup-garou.</p>
      </Sheet>
    </div>
  );
};

export const Notification: Story = () => {
  const [open, setOpen] = useState(true);

  return (
    <ToastRegion label="Notifications">
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Afficher
      </Button>
      <Toast open={open} onOpenChange={setOpen} title="Connexion retrouvée" />
    </ToastRegion>
  );
};

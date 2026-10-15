import { useSyncExternalStore } from 'react';
import { getSettings, subscribeSettings, type Settings } from '../app/settings';

/** Configurações atuais; o componente re-renderiza quando qualquer opção muda. */
export function useSettings(): Settings { return useSyncExternalStore(subscribeSettings, getSettings, getSettings); }

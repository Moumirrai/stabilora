import { writable } from 'svelte/store';

export interface RenderingConfig {
  node: {
    color: string;
    scale: number;
  };
  element: {
    bottomFibersVisible: boolean;
    bottomFibersDashed: boolean;
  };
  supports: {
    scale: number;
    visible: boolean;
  };
  isDirty: boolean;
}

const defaultConfig: RenderingConfig = {
  node: {
    color: '#ffffff',
    scale: 1.0,
  },
  element: {
    bottomFibersVisible: true,
    bottomFibersDashed: true,
  },
  supports: {
    scale: 1.0,
    visible: true,
  },
  isDirty: false,
};

export const renderingConfigStore = writable<RenderingConfig>(defaultConfig);

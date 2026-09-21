import ImageEditor from '@unlayer/react-image-editor';
import type {
  ImageEditorInstance,
  ImageEditorOptions,
  ImageEditorRef,
  ImageEditorSaveResult,
} from '@unlayer/react-image-editor';
import type { RefObject } from 'react';

/**
 * MODULE SCOPE ON PURPOSE. Unlayer issue #31: deeply-equal options objects produce different keys and
 * force a full remount, silently destroying the canvas and undo history. Never inline this.
 *
 * Crop, resize, filter and frame are off: crop/resize change output dimensions and break region
 * comparison, filters would force normalised scoring, and a frame writes a border over every edge region.
 */
export const EDITOR_OPTIONS = {
  theme: 'dark',
  features: {
    imageEditor: {
      dock: 'left',
      tools: {
        crop: false,
        resize: false,
        filter: false,
        frame: false,
        draw: true,
        shapes: true,
        stickers: true,
        text: true,
      },
    },
  },
  translations: {
    en: {
      'image_editor.toolbar.save': 'SAVE FILE',
      'image_editor.toolbar.cancel': 'Walk away',
      'image_editor.tools.shapes': 'Blackout',
      'image_editor.tools.stickers': 'Stickers',
      'image_editor.tools.draw': 'Scribble',
      'image_editor.tools.text': 'Write',
    },
  },
  // `dock` is honoured by the CDN editor but missing from the @unlayer/types bundled with the wrapper
  // (the README notes this), hence the assertion.
} as ImageEditorOptions;

type Props = {
  image: string;
  editorRef?: RefObject<ImageEditorRef>;
  onLoad?: (editor: ImageEditorInstance) => void;
  onSave: (result: ImageEditorSaveResult) => void;
  onCancel?: () => void;
  onLoadError?: () => void;
  onError?: (error: Error) => void;
  minHeight?: number | string;
};

export function Editor({
  image,
  editorRef,
  onLoad,
  onSave,
  onCancel,
  onLoadError,
  onError,
  minHeight = 640,
}: Props) {
  return (
    <ImageEditor
      ref={editorRef}
      image={image}
      options={EDITOR_OPTIONS}
      minHeight={minHeight}
      onLoad={onLoad}
      onSave={onSave}
      onCancel={onCancel}
      onLoadError={onLoadError}
      onError={onError}
    />
  );
}

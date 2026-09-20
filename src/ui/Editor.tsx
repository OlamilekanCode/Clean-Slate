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
      'image_editor.toolbar.save': 'COMMIT TO FILE',
      'image_editor.tools.shapes': 'Redact',
      'image_editor.tools.stickers': 'Overlay',
      'image_editor.tools.draw': 'Retouch',
      'image_editor.tools.text': 'Relabel',
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
  onLoadError?: () => void;
  onError?: (error: Error) => void;
};

export function Editor({ image, editorRef, onLoad, onSave, onLoadError, onError }: Props) {
  return (
    <ImageEditor
      ref={editorRef}
      image={image}
      options={EDITOR_OPTIONS}
      minHeight={640}
      onLoad={onLoad}
      onSave={onSave}
      onLoadError={onLoadError}
      onError={onError}
    />
  );
}

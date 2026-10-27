import type { CameraUniforms } from './CameraUniforms';
import { GLYPH_DEFS, type GlyphName } from '../glyphs/supportGlyphs';
import {
  DEFAULT_SUPPORT_COLOR,
  DEFAULT_SUPPORT_SIZE,
  DEFAULT_SUPPORT_STROKE,
} from './supportStyle';
import { GlyphMesh } from './GlyphMesh';

export class SupportMesh extends GlyphMesh<GlyphName> {
  constructor(cameraUniforms: CameraUniforms) {
    super(cameraUniforms, {
      defs: GLYPH_DEFS,
      size: DEFAULT_SUPPORT_SIZE,
      stroke: DEFAULT_SUPPORT_STROKE,
      color: DEFAULT_SUPPORT_COLOR,
      label: 'SupportMesh',
    });
  }
}

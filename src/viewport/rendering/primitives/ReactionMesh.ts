import type { CameraUniforms } from './CameraUniforms';
import {
  REACTION_GLYPH_DEFS,
  type ReactionGlyphName,
} from '../glyphs/reactionGlyphs';
import {
  DEFAULT_REACTION_COLOR,
  DEFAULT_REACTION_SIZE,
  DEFAULT_REACTION_STROKE,
} from './reactionStyle';
import { GlyphMesh } from './GlyphMesh';

export class ReactionMesh extends GlyphMesh<ReactionGlyphName> {
  constructor(cameraUniforms: CameraUniforms) {
    super(cameraUniforms, {
      defs: REACTION_GLYPH_DEFS,
      size: DEFAULT_REACTION_SIZE,
      stroke: DEFAULT_REACTION_STROKE,
      color: DEFAULT_REACTION_COLOR,
      label: 'ReactionMesh',
    });
  }
}

#version 300 es
precision highp float;

// MAX_LABEL_CHANNELS is injected from textLayout.ts
// in createLabelProgram; the #define below is a fallback default.
#define MAX_LABEL_CHANNELS 32

in vec2 aCorner;              // quad corner, (0,0) = top-left, (1,1) = bottom-right
in vec2 aAnchor;              // world x,y
in vec2 aOffset;              // em, from anchor, y down
in vec2 aSize;                // em
in vec4 aUvBounds;            // u0, v0 (top), u1, v1 (bottom)
in vec4 aColor;
in vec2 aRotationAndFlags;    // radians; size channel

uniform float uCameraScale;
uniform vec2 uCameraPosition; // CSS px
uniform vec2 uStageSize;      // CSS px
uniform float uChannelFontSizePx[MAX_LABEL_CHANNELS]; // font size (px) per size channel

out vec2 vUv;
out vec4 vColor;
flat out float vFontSizePx;

void main() {
    // World anchor -> screen px -> NDC (flip y).
    vec2 screenPx = aAnchor * uCameraScale + uCameraPosition;
    vec2 anchorNdc = screenPx * vec2(2.0, -2.0) / uStageSize + vec2(-1.0, 1.0);

    // Rotation as (cos, sin) in screen px space (the camera never rotates).
    float angle = aRotationAndFlags.x;
    int flags = int(aRotationAndFlags.y + 0.5);
    float fontSizePx = uChannelFontSizePx[flags & (MAX_LABEL_CHANNELS - 1)];
    vec2 cs = vec2(cos(angle), sin(angle));

    // Screen px offset, scaled by the channel's font size.
    vec2 offsetPx = (aOffset + aCorner * aSize) * fontSizePx;
    vec2 rotatedPx = vec2(cs.x * offsetPx.x - cs.y * offsetPx.y,
                          cs.y * offsetPx.x + cs.x * offsetPx.y);

    // Pixels -> NDC (flip y).
    vec2 offsetNdc = rotatedPx * vec2(2.0, -2.0) / uStageSize;

    gl_Position = vec4(anchorNdc + offsetNdc, 0.0, 1.0);

    vUv = mix(aUvBounds.xy, aUvBounds.zw, aCorner);
    vColor = aColor;
    vFontSizePx = fontSizePx;
}

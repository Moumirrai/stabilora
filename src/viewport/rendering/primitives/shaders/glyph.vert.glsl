#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 aExtrude;    // unit quad corner in [-1..1]^2
in vec4 aInstance;   // x, z (world), angle (radians), glyph index

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform float uCameraScale;
uniform float uGlyphSize;
uniform float uGlyphStroke;
uniform sampler2D uGlyphAtlas;

out vec2 vLocal;       // glyph-space position in screen pixels (unrotated)
flat out vec2 vRange;  // first segment texel, segment count

// Atlas layout is documented in glyphs/atlas.ts.
vec4 fetchTexel(int i) {
    int w = textureSize(uGlyphAtlas, 0).x;
    return texelFetch(uGlyphAtlas, ivec2(i % w, i / w), 0);
}

void main() {
    int glyph = int(aInstance.w + 0.5);
    vec4 header = fetchTexel(glyph * 2);
    vec4 box = fetchTexel(glyph * 2 + 1);

    // Quad covering the glyph bounds plus room for the stroke and its AA ramp.
    float pad = uGlyphStroke * 0.5 + 2.0;
    vec2 lo = box.xy * uGlyphSize - pad;
    vec2 hi = box.zw * uGlyphSize + pad;
    vec2 localPx = mix(lo, hi, aExtrude * 0.5 + 0.5);

    // Rotate rigidly around the node, in screen pixels, so the glyph keeps a
    // constant on-screen size no matter the camera zoom.
    float c = cos(aInstance.z);
    float s = sin(aInstance.z);
    vec2 rotated = vec2(localPx.x * c - localPx.y * s,
                        localPx.x * s + localPx.y * c);

    vec2 world = aInstance.xy + rotated / uCameraScale;

    vLocal = localPx;
    vRange = header.xy;

    mat3 worldMatrix = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((worldMatrix * vec3(world, 1.0)).xy, 0.0, 1.0);
}

#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vLocal;       // glyph-space position, screen pixels
flat in vec2 vRange;  // first segment texel, segment count

out vec4 fragColor;

uniform float uSupportSize;
uniform float uSupportStroke;
uniform vec3 uSupportColor;
uniform sampler2D uGlyphAtlas;

// Everything below is evaluated in screen pixels, so a distance field has a
// gradient of one per pixel and a one-pixel edge ramp lands on the boundary.

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
    return length(pa - ba * h);
}

// Coverage of a stroke around a distance field, ramp centered on the edge.
float stroke(float d, float halfThick) {
    return clamp(halfThick - d + 0.5, 0.0, 1.0);
}

vec4 fetchTexel(int i) {
    int w = textureSize(uGlyphAtlas, 0).x;
    return texelFetch(uGlyphAtlas, ivec2(i % w, i / w), 0);
}

void main() {
    int start = int(vRange.x + 0.5);
    int count = int(vRange.y + 0.5);

    // One combined distance field and one stroke() call: no seams where
    // segments meet, and the stroke width is exactly uSupportStroke pixels
    // regardless of the glyph size.
    float d = 1e6;
    for (int i = 0; i < count; i++) {
        vec4 seg = fetchTexel(start + i);
        d = min(d, sdSegment(vLocal, seg.xy * uSupportSize, seg.zw * uSupportSize));
    }

    float ink = stroke(d, uSupportStroke * 0.5);
    if (ink <= 0.0) discard;

    // Premultiplied alpha, as Pixi's blend mode expects.
    fragColor = vec4(uSupportColor * ink, ink);
}

#version 300 es
precision highp float;

in vec2 vUv;
in vec4 vColor;
flat in float vFontSizePx;

uniform sampler2D uAtlas;
uniform float uPxRange;          // atlas distanceRange, atlas px
uniform float uAtlasFontSizePx;  // atlas.size
uniform float uRes;              // device pixel ratio (ViewportUniforms)

out vec4 fragColor;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    vec3 msdf = texture(uAtlas, vUv).rgb;
    float sd = median(msdf.r, msdf.g, msdf.b);
    float screenPxRange = max(uPxRange * (vFontSizePx * uRes / uAtlasFontSizePx), 1.0);
    float screenPxDistance = screenPxRange * (sd - 0.5);
    float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
    float a = vColor.a * alpha;
    if (a <= 0.0) discard;
    fragColor = vec4(vColor.rgb * a, a);
}

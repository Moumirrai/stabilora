#version 300 es
precision highp float;

in float vState;
out vec4 fragColor;

uniform float uPointSize;
uniform vec3 uNodeColor;
uniform vec3 uSelectColor;
uniform float uGhostAlpha;

#define FILL_RADIUS 0.5
#define GLOW_PADDING 24.0
#define GLOW_RADIUS 3.0
#define GLOW_INTENSITY 0.35
#define GLOW_COLOR vec3(1.0, 0.85, 0.0)

void main() {
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float dist = length(coord);

    float state = vState;
    bool selected = mod(state, 2.0) >= 1.0;
    bool hovered = mod(floor(state / 2.0), 2.0) >= 1.0;
    bool ghost = state >= 4.0;

    float spritePx = (uPointSize + GLOW_PADDING) / 2.0;
    float fillPx = FILL_RADIUS * uPointSize / 2.0;
    float fillRadius = fillPx / spritePx;

    float aa = 1.0 / spritePx;
    float fillAlpha = 1.0 - smoothstep(fillRadius - aa, fillRadius, dist);

    float distPx = dist * spritePx;
    float glowPx = max(distPx - fillPx, 0.0);
    float glowAlpha = hovered ? GLOW_INTENSITY * exp(-glowPx / GLOW_RADIUS) : 0.0;

    glowAlpha *= 1.0 - smoothstep(0.8, 1.0, dist);

    float outAlpha = fillAlpha + glowAlpha * (1.0 - fillAlpha);
    if (outAlpha <= 0.0) discard;

    vec3 nodeColor = uNodeColor;
    if (selected) nodeColor = uSelectColor;
    if (hovered) nodeColor = mix(nodeColor, GLOW_COLOR, 0.35);

    vec3 outColor = nodeColor * fillAlpha + GLOW_COLOR * glowAlpha * (1.0 - fillAlpha);

    if (ghost) outAlpha *= uGhostAlpha;

    fragColor = vec4(outColor, outAlpha);
}

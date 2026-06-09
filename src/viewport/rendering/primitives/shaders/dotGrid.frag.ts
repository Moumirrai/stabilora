export const dotGridFragmentShader = `
precision highp float;

uniform float uCameraScale;
uniform vec2 uCameraPosition; // worldContainer.position in screen px
uniform vec2 uStageSize;
uniform float uResolution;

const float BASE_SIZE = 100.0;
const float DOT_RADIUS_PX = 1.5;
const float ORIGIN_RADIUS_PX = 3.5;
const float AXIS_HALF_WIDTH_PX = 0.5;

const vec4 DOT_COLOR = vec4(0.373, 0.373, 0.373, 1.0);
const vec4 ORIGIN_COLOR = vec4(1.00, 0.80, 0.00, 0.95);
const vec4 AXIS_COLOR = vec4(0.373, 0.373, 0.373, 1.0);

float maskPx(float dPx, float rPx) {
    float aa = 1.0;
    return 1.0 - smoothstep(rPx - aa, rPx + aa, dPx);
}

void main() {
    if (uCameraScale <= 0.001) discard;

    vec2 fragCoordLogical = gl_FragCoord.xy / uResolution;
    vec2 screenPos = vec2(fragCoordLogical.x, uStageSize.y - fragCoordLogical.y);

    vec2 worldPos = (screenPos - uCameraPosition) / uCameraScale;

    float level = floor(-log2(uCameraScale) + 0.5);
    float stepW = BASE_SIZE * exp2(level);

    // nearest snapped grid point in world
    vec2 nearestW = floor(worldPos / stepW + 0.5) * stepW;

    // keep dots fixed in pixel size
    float dotDistPx = length((worldPos - nearestW) * uCameraScale);
    float dotMask = maskPx(dotDistPx, DOT_RADIUS_PX);

    // origin and axes (also pixel-sized)
    float originMask = maskPx(length(worldPos * uCameraScale), ORIGIN_RADIUS_PX);
    float xAxisMask = maskPx(abs(worldPos.y) * uCameraScale, AXIS_HALF_WIDTH_PX);
    float yAxisMask = maskPx(abs(worldPos.x) * uCameraScale, AXIS_HALF_WIDTH_PX);
    float axisMask = max(xAxisMask, yAxisMask);

    vec4 color = vec4(0.0);
    color = mix(color, AXIS_COLOR, axisMask);
    color = mix(color, DOT_COLOR, dotMask);
    color = mix(color, ORIGIN_COLOR, originMask);

    if (color.a < 0.01) discard;
    gl_FragColor = color;
}
`;

#version 300 es
precision highp float;

in vec2 vPos;
in vec2 vStart;
in vec2 vEnd;
in float vState;

out vec4 fragColor;

uniform float uCameraScale;
uniform float uBeamThickness;
uniform float uBeamDashLength;
uniform float uBeamGapLength;
uniform float uBeamOffset;

uniform vec3 uSelectColor;
uniform float uGhostAlpha;
uniform vec3 uGlowColor;

#define GLOW_RADIUS 2.0
#define GLOW_INTENSITY 0.35

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

void main() {
    vec2 pa = vPos - vStart;
    vec2 ba = vEnd - vStart;
    float baLenSq = dot(ba, ba);

    // Unclamped t: lets fragments in the extruded cap region (past the real
    // endpoints) keep advancing the dash phase instead of freezing at 0/1.
    float t = dot(pa, ba) / baLenSq;
    float tClamped = clamp(t, 0.0, 1.0);

    vec2 d = pa - ba * tClamped;
    float distMain = length(d);
    float screenDistMain = distMain * uCameraScale;

    float lenBa = length(ba);
    vec2 normDir = lenBa > 0.0 ? ba / lenBa : vec2(1.0, 0.0);
    vec2 normal = vec2(-normDir.y, normDir.x);

    vec2 offsetVec = normal * (uBeamOffset / uCameraScale);
    vec2 dOffset = (pa - offsetVec) - ba * clamp(dot(pa - offsetVec, ba) / baLenSq, 0.0, 1.0);
    float screenDistOffset = length(dOffset) * uCameraScale;

    // Unclamped, signed distance along the line — continues smoothly past
    // both endpoints so the terminal dash gets a proper symmetric cap.
    float screenLineDist = t * lenBa * uCameraScale;

    float dashPeriod = uBeamDashLength + uBeamGapLength;
    float finalDistOffset = screenDistOffset;
    if (dashPeriod > 0.0) {
      float dashCenter = uBeamDashLength / 2.0;
      // Centered mod: wraps around the dash's own center, so both the leading
      // and trailing edges see a small, symmetric distance — not just the
      // trailing one.
      float phase = mod(screenLineDist - dashCenter + dashPeriod * 0.5, dashPeriod) - dashPeriod * 0.5;
      float dashSDF = abs(phase) - dashCenter;
      finalDistOffset = length(vec2(max(0.0, dashSDF), screenDistOffset));
    }

    float aa = 1.0;
    float halfThick = uBeamThickness / 2.0;

    float combinedDist = smin(screenDistMain, finalDistOffset, aa * 2.0);
    float beamAlpha = 1.0 - smoothstep(halfThick - aa, halfThick, combinedDist);

    float state = vState;
    bool selected = mod(state, 2.0) >= 1.0;
    bool hovered = mod(floor(state / 2.0), 2.0) >= 1.0;
    bool ghost = state >= 4.0;

    vec3 beamColor = vec3(1.0, 1.0, 1.0);
    if (selected) beamColor = uSelectColor;
    if (hovered) beamColor = mix(beamColor, uGlowColor, 0.35);

    float minEdgeDist = max(combinedDist - halfThick, 0.0);
    float glowAlpha = hovered ? GLOW_INTENSITY * exp(-minEdgeDist / GLOW_RADIUS) : 0.0;

    float outAlpha = beamAlpha + glowAlpha * (1.0 - beamAlpha);
    vec3 outColor = beamColor * beamAlpha + uGlowColor * glowAlpha * (1.0 - beamAlpha);

    if (outAlpha <= 0.0) discard;

    if (ghost) outAlpha *= uGhostAlpha;

    fragColor = vec4(outColor, outAlpha);
}
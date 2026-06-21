export const beamFragmentShader = `
precision highp float;

in vec2 vPos;
in vec2 vStart;
in vec2 vEnd;

uniform float uCameraScale;
uniform float uBeamThickness;
uniform float uBeamDashLength;
uniform float uBeamGapLength;
uniform float uBeamOffset;

void main() {
    vec2 pa = vPos - vStart;
    vec2 ba = vEnd - vStart;

    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);

    vec2 d = pa - ba * h;

    float distMain = length(d);
    float screenDistMain = distMain * uCameraScale;

    float lenBa = length(ba);
    vec2 normDir = lenBa > 0.0 ? ba / lenBa : vec2(1.0, 0.0);
    vec2 normal = vec2(-normDir.y, normDir.x);

    vec2 offsetVec = normal * (uBeamOffset / uCameraScale);

    vec2 dOffset = (pa - offsetVec) - ba * clamp(dot(pa - offsetVec, ba) / dot(ba, ba), 0.0, 1.0);
    float distOffset = length(dOffset);
    float screenDistOffset = distOffset * uCameraScale;

    float lineDist = length(ba * h);
    float screenLineDist = lineDist * uCameraScale;

    float finalDistOffset = screenDistOffset;
    float dashPeriod = uBeamDashLength + uBeamGapLength;
    if (dashPeriod > 0.0) {
      float currentDashPos = mod(screenLineDist, dashPeriod);
      float dashCenter = uBeamDashLength / 2.0;
      float distToDashCenter = abs(currentDashPos - dashCenter);
      float dashSDF = distToDashCenter - (uBeamDashLength / 2.0);
      finalDistOffset = length(vec2(max(0.0, dashSDF), screenDistOffset));
    }

    float aa = 1.0;

    float alphaMain = 1.0 - smoothstep(uBeamThickness / 2.0 - aa, uBeamThickness / 2.0, screenDistMain);

    float alphaOffset = 1.0 - smoothstep(uBeamThickness / 2.0 - aa, uBeamThickness / 2.0, finalDistOffset);

    float finalAlpha = max(alphaMain, alphaOffset);

    if (finalAlpha <= 0.0) discard;

    gl_FragColor = vec4(finalAlpha, finalAlpha, finalAlpha, finalAlpha);
}
`;

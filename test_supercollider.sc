// Test SuperCollider synthesis
s.boot;

// Wait for server to boot, then create a simple synth
s.waitForBoot({
    // Define a simple sine wave synthesizer
    SynthDef(\testSine, {
        |freq = 440, amp = 0.3, gate = 1|
        var env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.5, 1.0), gate, doneAction: 2);
        var osc = SinOsc.ar(freq, 0, amp * env);
        Out.ar(0, osc ! 2);
    }).add;
    
    // Play the synth
    x = Synth(\testSine, [\freq, 440, \amp, 0.3]);
    
    // Stop after 3 seconds
    3.wait;
    x.set(\gate, 0);
});
"""Original synthesized instrumental for Trent Saves Christmas."""
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write
rate = 32000
beat = 60 / 152
duration = 128 * beat
rng = np.random.default_rng(24)
mix = np.zeros((int(duration * rate), 2))
def add(wave, start, gain=1, pan=0):
    offset = int(start * rate)
    count = min(len(wave), len(mix) - offset)
    if count > 0:
        mix[offset:offset+count, 0] += wave[:count] * gain * np.sqrt((1-pan)/2)
        mix[offset:offset+count, 1] += wave[:count] * gain * np.sqrt((1+pan)/2)
def guitar(frequency, length, detune):
    t = np.arange(int(length*rate))/rate
    wave = sum(np.sin(2*np.pi*f*(1+detune*.001)*h*t+detune*.2)/(h*2.3)
               for f in [frequency, frequency*1.5, frequency*2] for h in [1,2,3,4,5,7])
    envelope = np.minimum(1,t/.003)*np.exp(-t/(length*.48))*np.minimum(1,(length-t)/.025)
    return sosfilt(butter(2,3500,fs=rate,output='sos'),np.tanh(wave*3.8)*envelope)
roots = [82.4069,65.4064,98,73.4162]
melody = [12,19,16,14,12,7,11,14,16,19,24,23,19,16,14,11]
for bar in range(32):
    root = roots[(bar//2)%4]
    for eighth in range(8):
        at = (bar*4+eighth/2)*beat
        length = beat*(.4 if eighth%4<3 else .8)
        add(guitar(root,length,-1),at,.21,-.75)
        add(guitar(root,length,1),at+.007,.21,.75)
        t = np.arange(int(length*rate))/rate
        add(np.sin(2*np.pi*root/2*t)*np.exp(-t/length*2),at,.24)
    for b in range(4):
        at = (bar*4+b)*beat
        for offset in ([0,.5] if b in [0,2] else [0]):
            t = np.arange(int(.19*rate))/rate
            kick = np.sin(2*np.pi*(45*t+65*.025*(1-np.exp(-t/.025))))*np.exp(-t*22)
            add(kick,at+offset*beat,.65)
        if b%2:
            t = np.arange(int(.18*rate))/rate
            noise = sosfilt(butter(1,1200,fs=rate,btype='high',output='sos'),rng.normal(0,1,len(t)))
            add((noise*.22+np.sin(2*np.pi*185*t)*.17)*np.exp(-t*24),at,.7)
        for offset in [0,.5]:
            t = np.arange(int(.07*rate))/rate
            noise = sosfilt(butter(2,6500,fs=rate,btype='high',output='sos'),rng.normal(0,1,len(t)))
            add(noise*np.exp(-t*60),at+offset*beat,.065,.25)
        if bar>=4:
            frequency = 329.6276*2**(melody[(bar*4+b)%16]/12)
            t = np.arange(int(beat*1.7*rate))/rate
            bell = sum(np.sin(2*np.pi*frequency*h*t)*np.exp(-t*(2.5+h*.45))/(1+h*.35) for h in [1,2,2.76,4.07])
            add(bell*np.minimum(1,t/.002),at,.11,-.3 if b%2 else .3)
    for offset in [0,1.5,2,3.5]:
        t = np.arange(int(.15*rate))/rate
        bells = sum(np.sin(2*np.pi*f*t) for f in [3119,4327,5711])*np.exp(-t*38)
        add(bells,(bar*4+offset)*beat,.027,-.4)
mix = np.tanh(mix*1.25)
mix *= .91/max(.91,np.max(np.abs(mix)))
fade = int(.01*rate)
mix[:fade] *= np.linspace(0,1,fade)[:,None]
mix[-fade:] *= np.linspace(1,0,fade)[:,None]
write('/tmp/ribbonfall.wav',rate,(mix*32767).astype(np.int16))
print(round(duration,2),'seconds')

"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as Tone from 'tone';
import { create } from 'zustand';

type Bone = {
  id: string;
  type: 'skull' | 'vertebra' | 'rib' | 'limb';
  position: { x: number; y: number };
  connected: boolean;
};

type AudioStore = {
  synth: Tone.PolySynth | null;
  setSynth: (synth: Tone.PolySynth) => void;
};

const useAudioStore = create<AudioStore>((set) => ({
  synth: null,
  setSynth: (synth) => set({ synth }),
}));

const BONE_FREQUENCIES: Record<string, number> = {
  skull: 200,
  vertebra: 300,
  rib: 400,
  limb: 500,
};

export default function DinoAssembly() {
  const [bones, setBones] = useState<Bone[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioContextStarted = useRef(false);
  const { synth, setSynth } = useAudioStore();

  useEffect(() => {
    // Initialize bones
    const initialBones: Bone[] = [
      { id: '1', type: 'skull', position: { x: 100, y: 100 }, connected: false },
      { id: '2', type: 'vertebra', position: { x: 200, y: 200 }, connected: false },
      { id: '3', type: 'rib', position: { x: 300, y: 300 }, connected: false },
      { id: '4', type: 'limb', position: { x: 400, y: 400 }, connected: false },
    ];
    setBones(initialBones);

    // Initialize Web Audio
    if (!audioContextStarted.current) {
      const newSynth = new Tone.PolySynth(Tone.Synth).toDestination();
      setSynth(newSynth);
      audioContextStarted.current = true;
    }

    // Initialize Web Worker for audio processing
    const worker = new Worker(new URL('../workers/audio.ts', import.meta.url));
    worker.onmessage = (event) => {
      console.log('Received from worker:', event.data);
    };

    return () => {
      worker.terminate();
      synth?.dispose();
    };
  }, []);

  const startAudioContext = async () => {
    await Tone.start();
    console.log('Audio context started');
  };

  const playBoneSound = (boneType: string) => {
    if (synth) {
      const frequency = BONE_FREQUENCIES[boneType];
      synth.triggerAttackRelease(frequency, '0.1');
    }
  };

  const handleBoneClick = (bone: Bone) => {
    if (!audioContextStarted.current) {
      startAudioContext();
    }
    playBoneSound(bone.type);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (synth) {
      synth.volume.value = Tone.gainToDb(newVolume);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-8 font-serif">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl text-center mb-8 font-bold text-amber-900">
          DinoSynth Assembly
        </h1>

        <div className="mb-6 flex justify-between items-center">
          <Button
            onClick={startAudioContext}
            className="bg-amber-700 hover:bg-amber-800"
          >
            Initialize Audio
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Sound Controls</Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-50">
              <DialogHeader>
                <DialogTitle>Sound Parameters</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <label className="block text-sm font-medium mb-2">Volume</label>
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative h-[600px] bg-stone-200 rounded-lg border-4 border-amber-900 overflow-hidden">
          {bones.map((bone) => (
            <div
              key={bone.id}
              className={`absolute cursor-move p-4 ${
                bone.connected ? 'text-green-600' : 'text-amber-900'
              }`}
              style={{
                left: bone.position.x,
                top: bone.position.y,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => handleBoneClick(bone)}
            >
              <div className="text-4xl">
                {bone.type === 'skull' && '💀'}
                {bone.type === 'vertebra' && '🦴'}
                {bone.type === 'rib' && '🦴'}
                {bone.type === 'limb' && '🦿'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center text-sm text-amber-900">
          Click on bones to hear their unique sounds
        </div>
      </div>
    </div>
  );
}

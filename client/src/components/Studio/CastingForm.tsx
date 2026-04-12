import React from 'react';
import { Users, User, Plus, Trash2, Shirt, Activity } from 'lucide-react';

export interface Character {
id: number;
name: string;
physical_details: string;
clothing_details: string;
action: string;
expression: string;
}

export interface CastingFormProps {
characters: Character[];
setCharacters: (chars: Character[]) => void;
}

export const initialChar: Character = {
id: Date.now(),
name: "",
physical_details: "",
clothing_details: "",
action: "",
expression: ""
};

export function CastingForm({ characters, setCharacters }: CastingFormProps) {
const updateChar = (index: number, field: keyof Character, value: string) => {
const newChars = [...characters];
(newChars[index] as any)[field] = value;
setCharacters(newChars);
};

const addChar = () => setCharacters([...characters, { ...initialChar, id: Date.now() }]);

const removeChar = (idx: number) => {
if (characters.length > 1) setCharacters(characters.filter((_, i) => i !== idx));
};

return (
  <div className="p-5 border-b border-zinc-800 space-y-4">
    <div className="flex justify-between items-center">
      <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
        <Users className="w-3 h-3"/> O Personagem
      </label>
      <button
        onClick={addChar}
        className="text-[10px] bg-zinc-900 hover:bg-purple-900 text-zinc-400 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
      >
        <Plus className="w-3 h-3"/> Add
      </button>
    </div>

  {characters.map((char, i) => (
        <div key={char.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4 relative group shadow-inner">
            
            {/* Identificação Principal */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <User className="absolute left-2 top-2.5 w-3 h-3 text-zinc-500" />
                    <input 
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 pl-7 text-[11px] text-white focus:border-purple-500 outline-none placeholder:text-zinc-600" 
                        placeholder="Nome ou ID (ex: Personagem Principal)" 
                        value={char.name} 
                        onChange={e => updateChar(i, 'name', e.target.value)} 
                    />
                </div>
            </div>

            {/* Físico, Pele e Rosto (Substitui Idade, Etnia, Cabelo, Olhos) */}
            <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1 mb-1">
                    <Activity className="w-2.5 h-2.5"/> Como ele é
                </label>
                <textarea 
                    className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-[11px] text-zinc-200 h-20 resize-none focus:border-purple-500 outline-none placeholder:text-zinc-600 shadow-inner"
                    placeholder="Nome, sexo, idade, etnia, traços marcantes, tipo de pele, rugas de expressão, cor dos olhos e estilo de cabelo..."
                    value={char.physical_details}
                    onChange={e => updateChar(i, 'physical_details', e.target.value)}
                />
            </div>

            {/* Styling e Vestimenta (Substitui Roupa e Acessórios) */}
            <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1 mb-1">
                    <Shirt className="w-2.5 h-2.5"/> Styling e acessórios
                </label>
                <textarea 
                    className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-[11px] text-zinc-200 h-14 resize-none focus:border-purple-500 outline-none placeholder:text-zinc-600 shadow-inner"
                    placeholder="Tecidos, caimento, marcas de uso, cores e acessórios específicos..."
                    value={char.clothing_details}
                    onChange={e => updateChar(i, 'clothing_details', e.target.value)}
                />
            </div>

            {/* Expressão e Ação em Tempo Real */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase">Expressão</label>
                    <input 
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-[11px] text-white outline-none focus:border-purple-500" 
                        placeholder="Ex: Sorriso irônico" 
                        value={char.expression} 
                        onChange={e => updateChar(i, 'expression', e.target.value)} 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase">Ação Específica</label>
                    <input 
                        className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-[11px] text-white outline-none focus:border-purple-500" 
                        placeholder="Ex: Olhando o relógio" 
                        value={char.action} 
                        onChange={e => updateChar(i, 'action', e.target.value)} 
                    />
                </div>
            </div>
            
            {characters.length > 1 && (
                <button
                    onClick={() => removeChar(i)}
                    className="absolute top-2 right-2 text-zinc-700 hover:text-red-500 transition-colors p-1"
                >
                    <Trash2 className="w-3.5 h-3.5"/>
                </button>
            )}
        </div>
    ))}
  </div>
);
}

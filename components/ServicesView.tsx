import React, { useState } from 'react';
import { Service } from '../types';
import { Trash2, Edit2, Plus, Save, X } from 'lucide-react';

interface ServicesViewProps {
  services: Service[];
  onAdd: (name: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ services, onAdd, onEdit, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSaveNew = () => {
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (service: Service) => {
    setEditingId(service.id);
    setEditName(service.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onEdit(editingId, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Serviços</h1>
          <p className="text-slate-400 mt-1">Cadastre os serviços disponíveis para atendimento.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Novo Serviço
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        
        {/* Add Form */}
        {isAdding && (
          <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex gap-4 items-center">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do novo serviço"
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-2 focus:border-indigo-500 outline-none"
            />
            <button onClick={handleSaveNew} className="text-emerald-400 hover:bg-slate-700 p-2 rounded">
              <Save size={20} />
            </button>
            <button onClick={() => setIsAdding(false)} className="text-red-400 hover:bg-slate-700 p-2 rounded">
              <X size={20} />
            </button>
          </div>
        )}

        {/* List */}
        <div className="divide-y divide-slate-700">
          {services.length === 0 ? (
             <div className="p-8 text-center text-slate-500">Nenhum serviço cadastrado.</div>
          ) : (
            services.map(service => (
              <div key={service.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors group">
                {editingId === service.id ? (
                  <div className="flex-1 flex gap-4 items-center">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-indigo-500 rounded px-3 py-1 outline-none"
                    />
                    <button onClick={handleSaveEdit} className="text-emerald-400 hover:bg-slate-800 p-2 rounded"><Save size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="text-red-400 hover:bg-slate-800 p-2 rounded"><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                        {service.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-lg">{service.name}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleStartEdit(service)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => onDelete(service.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
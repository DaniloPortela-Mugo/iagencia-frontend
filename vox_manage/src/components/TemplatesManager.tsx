import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
}

const TemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: 'Campanha Redes Sociais',
      description: 'Template para campanhas em redes sociais',
      category: 'Social Media',
      content: 'Objetivo:\nPúblico-alvo:\nCanais:\nOrçamento:\nPrazo:'
    },
    {
      id: '2',
      name: 'Identidade Visual',
      description: 'Template para projetos de identidade visual',
      category: 'Design',
      content: 'Briefing da marca:\nValores:\nPersonalidade:\nCores:\nTipografia:'
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    content: ''
  });

  const handleCreateTemplate = () => {
    if (newTemplate.name && newTemplate.content) {
      const template: Template = {
        id: Date.now().toString(),
        ...newTemplate
      };
      setTemplates([...templates, template]);
      setNewTemplate({ name: '', description: '', category: '', content: '' });
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Templates de Projeto</h2>
          <p className="text-muted-foreground">Gerencie templates para agilizar a criação de briefs</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nome do template"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
            />
            <Input
              placeholder="Descrição"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
            />
            <Input
              placeholder="Categoria"
              value={newTemplate.category}
              onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
            />
            <Textarea
              placeholder="Conteúdo do template"
              value={newTemplate.content}
              onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
              rows={6}
            />
            <div className="flex space-x-2">
              <Button onClick={handleCreateTemplate}>Salvar</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Badge variant="secondary">{template.category}</Badge>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {template.content}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TemplatesManager;
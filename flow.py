from transitions import Machine

class CampaignFlow(object):
    # Estados conforme o JSON de fluxo
    states = ['inicio', 'planejamento', 'apresentacao_inicial', 'ajuste_briefing',
              'textos', 'imagens', 'apresentacao_final', 'finalizado']
    
    def __init__(self, initial_state='inicio'):
        self.state = initial_state
        self.machine = Machine(model=self, states=CampaignFlow.states, initial=initial_state)
        
        # Auto-avança para estados não-interativos
        self.machine.add_transition(trigger='next', source='inicio', dest='planejamento')
        self.machine.add_transition(trigger='next', source='planejamento', dest='apresentacao_inicial')
       
        # Na etapa "apresentacao_inicial", o usuário deve decidir (aprovar ou revisar)
        self.machine.add_transition(trigger='aprovar', source='apresentacao_inicial', dest='textos')
        self.machine.add_transition(trigger='revisar', source='apresentacao_inicial', dest='ajuste_briefing')
       
        # Em "ajuste_briefing", se aprovado, vai para "textos"; se revisado, permanece em "ajuste_briefing"
        self.machine.add_transition(trigger='aprovar', source='ajuste_briefing', dest='textos')
        self.machine.add_transition(trigger='revisar', source='ajuste_briefing', dest='ajuste_briefing')
       
        # Em "textos": se aprovado, vai para "imagens"; se revisado, permanece em "textos"
        self.machine.add_transition(trigger='aprovar', source='textos', dest='imagens')
        self.machine.add_transition(trigger='revisar', source='textos', dest='textos')
       
        # Em "imagens": se aprovado, vai para "apresentacao_final"; se revisado, permanece em "imagens"
        self.machine.add_transition(trigger='aprovar', source='imagens', dest='apresentacao_final')
        self.machine.add_transition(trigger='revisar', source='imagens', dest='imagens')
       
        # Em "apresentacao_final": se aprovado, vai para "finalizado"; se revisado, permanece em "apresentacao_final"
        self.machine.add_transition(trigger='aprovar', source='apresentacao_final', dest='finalizado')
        self.machine.add_transition(trigger='revisar', source='apresentacao_final', dest='apresentacao_final')

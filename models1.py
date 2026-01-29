# models.py
import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the base class first
Base = declarative_base()

class CampaignState(Base):
    __tablename__ = 'campaign_state'
    cliente_id = Column(String, primary_key=True)
    etapa_atual = Column(String, nullable=False)
    iteracoes = Column(Integer, default=0)

def init_db():
    try:
        # Create SQLite database (will be created in the same directory as your script)
        engine = create_engine('sqlite:///campanha.db', echo=True)
        
        # Create all tables
        Base.metadata.create_all(engine)
        
        # Create session maker
        Session = sessionmaker(bind=engine)
        logger.info("Database initialized successfully")
        return Session
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

class CampaignHistory(Base):
    __tablename__ = "campaign_history"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id  = Column(String, index=True)
    etapa       = Column(String)               # textos, imagens…
    versao      = Column(Integer)              # 1, 2, 3…
    conteudo    = Column(String)               # resposta “crua” do LLM
    aprovado    = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Define any additional fields you need for your campaign history
    
# Initialize the database and create Session maker
Session = init_db()
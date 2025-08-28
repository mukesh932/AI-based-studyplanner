# models.py
from datetime import datetime
from app import db

class FinancialTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200))
    transaction_type = db.Column(db.String(20))  # 'revenue' or 'expense'
    
    @classmethod
    def monthly_summary(cls):
        return db.session.query(
            db.func.strftime('%Y-%m', cls.date).label('month'),
            db.func.sum(db.case(
                [(cls.transaction_type == 'revenue', cls.amount)],
                else_=0
            )).label('revenue'),
            db.func.sum(db.case(
                [(cls.transaction_type == 'expense', cls.amount)],
                else_=0
            )).label('expense')
        ).group_by('month').all()
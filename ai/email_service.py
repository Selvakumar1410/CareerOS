from pydantic import BaseModel, Field
from .groq_service import groq_client
from .prompt_builder import EMAIL_PARSER_PROMPT

class ParsedEmailJob(BaseModel):
    company_name: str = Field(description="The name of the company.")
    role: str = Field(description="The job title or role.")
    job_id: str = Field(description="The unique requisition or job ID. Return 'Unknown' if missing.")
    application_date: str = Field(description="The date of application in YYYY-MM-DD format. Return 'Unknown' if missing.")
    status: str = Field(description="The status of the application. Must be one of: Applied, Shortlisted, Assessment, Interview, Offer, Rejected.")
    interview_date: str = Field(description="The date of the interview in YYYY-MM-DD format if mentioned. Return 'Unknown' if not mentioned.")
    assessment_date: str = Field(description="The date of the assessment in YYYY-MM-DD format if mentioned. Return 'Unknown' if not mentioned.")
    confidence: str = Field(description="Confidence level of this parse: 'high' or 'low'.")
    confidence_score: int = Field(description="A score from 0 to 100 on how confident you are that this is a job email.")

class EmailService:
    @staticmethod
    def parse_email(subject, body_text, sender, date_str):
        email_data = f"Sender: {sender}\nDate: {date_str}\nSubject: {subject}\nBody: {body_text[:2000]}"
        prompt = EMAIL_PARSER_PROMPT.replace("{email_text}", email_data)
        
        result_model = groq_client.generate_structured(prompt, schema=ParsedEmailJob, context_data={})
        
        if not result_model:
            return None
            
        if result_model.confidence == "low" or result_model.confidence_score < 50:
            return None
            
        status_map = {
            "applied": "Applied",
            "shortlisted": "Shortlisted",
            "assessment": "Assessment",
            "interview": "Interview",
            "offer": "Offer",
            "rejected": "Rejected"
        }
        
        raw_status = result_model.status
        if not raw_status:
            return None
            
        final_status = status_map.get(str(raw_status).lower(), "Applied")
            
        return {
            "company": result_model.company_name or "Unknown",
            "role": result_model.role or "Unknown",
            "status": final_status,
            "source": "Gmail",
            "confidence": "high",
            "applied_date": date_str,
            "interview_date": result_model.interview_date if result_model.interview_date != 'Unknown' else None,
            "assessment_date": result_model.assessment_date if result_model.assessment_date != 'Unknown' else None
        }

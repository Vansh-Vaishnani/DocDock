import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/utils/http';
import { ApiError } from '../../common/errors/ApiError';
import { DoctorModel } from '../doctor/doctor.repository';
import { UserModel } from '../auth/auth.repository';
import mongoose from 'mongoose';

// Google Generative AI import or mock fallback
let GeminiModel: any = null;
try {
  const { GoogleGenAI } = require('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const genAI = new GoogleGenAI(apiKey);
    GeminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
} catch (e) {
  // Silent fallback
}

export class AIController {
  async symptomCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symptoms, age, gender, duration, severity, existingDiseases } = req.body;
      if (!symptoms || !duration || !severity) {
        throw new ApiError('Symptoms, duration, and severity are required.', 400, 'VALIDATION_ERROR');
      }

      const disclaimer = 'This is AI-generated guidance and not a medical diagnosis.';

      if (GeminiModel) {
        const prompt = `You are an expert AI clinical triage assistant. Analyze this case:
Symptoms: ${symptoms}
Age: ${age || 'Not specified'}
Gender: ${gender || 'Not specified'}
Duration: ${duration}
Severity: ${severity}
Existing Diseases: ${existingDiseases || 'None'}

Provide a JSON response with:
- possibleConditions: string[] (top 2-3 most likely triage categories)
- urgencyLevel: 'low' | 'medium' | 'high'
- recommendedSpecialist: string
- homeCareSuggestions: string[]
- emergencyCareAdvised: boolean

Do not output code blocks or markdowns, output pure valid JSON only. Keep responses medically cautious. Include the warning: "${disclaimer}"`;
        
        try {
          const result = await GeminiModel.generateContent(prompt);
          const responseText = result.response.text().trim();
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          sendSuccess(res, { ...parsed, disclaimer }, 'Symptom check complete.');
          return;
        } catch (err) {
          // Fall back to rule-based analysis if Gemini fails
        }
      }

      // Rule-based Clinical Fallback Logic
      const sym = symptoms.toLowerCase();
      const sev = severity.toLowerCase();
      let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
      let recommendedSpecialist = 'General Physician';
      let possibleConditions: string[] = [];
      let homeCareSuggestions: string[] = [
        'Stay hydrated and monitor your temperature.',
        'Ensure proper rest and avoid strenuous physical activity.',
        'Keep a log of symptoms and temperature changes.'
      ];
      let emergencyCareAdvised = false;

      // Urgency
      if (sev.includes('severe') || sev.includes('high') || sym.includes('chest pain') || sym.includes('breathing') || sym.includes('loss of consciousness')) {
        urgencyLevel = 'high';
        emergencyCareAdvised = true;
        possibleConditions.push('Acute Respiratory/Cardiovascular distress');
        homeCareSuggestions = ['Do not wait. Seek immediate medical attention or visit nearest hospital emergency.'];
      } else if (sev.includes('moderate') || sym.includes('fever') || sym.includes('cough')) {
        urgencyLevel = 'medium';
      }

      // Specialists mapping
      if (sym.includes('chest') || sym.includes('heart') || sym.includes('bp')) {
        recommendedSpecialist = 'Cardiologist';
        possibleConditions.push('Cardiovascular Congestion');
      } else if (sym.includes('child') || sym.includes('baby') || sym.includes('pediatric')) {
        recommendedSpecialist = 'Pediatrician';
        possibleConditions.push('Common Pediatric Infection');
      } else if (sym.includes('skin') || sym.includes('rash') || sym.includes('itching')) {
        recommendedSpecialist = 'Dermatologist';
        possibleConditions.push('Allergic Dermatitis / Skin Rash');
      } else if (sym.includes('ear') || sym.includes('nose') || sym.includes('throat') || sym.includes('sinus')) {
        recommendedSpecialist = 'ENT Specialist';
        possibleConditions.push('Acute Upper Respiratory Tract/Sinus Infection');
      } else {
        possibleConditions.push('Viral Fever / Inflammatory Response');
      }

      sendSuccess(res, {
        possibleConditions,
        urgencyLevel,
        recommendedSpecialist,
        homeCareSuggestions,
        emergencyCareAdvised,
        disclaimer
      }, 'Symptom check complete.');
    } catch (error) {
      next(error);
    }
  }

  async recommendDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symptoms, specialization, location, preferOnline } = req.body;
      let querySpecialization = specialization;

      if (!querySpecialization && symptoms) {
        const sym = symptoms.toLowerCase();
        if (sym.includes('heart') || sym.includes('chest')) querySpecialization = 'Cardiologist';
        else if (sym.includes('child') || sym.includes('baby')) querySpecialization = 'Pediatrician';
        else if (sym.includes('skin') || sym.includes('rash')) querySpecialization = 'Dermatologist';
        else if (sym.includes('ear') || sym.includes('nose') || sym.includes('throat') || sym.includes('sinus')) querySpecialization = 'ENT Specialist';
        else querySpecialization = 'General Physician';
      }

      // Search matching doctors
      const filter: any = { verificationStatus: 'approved' };
      if (querySpecialization) {
        filter.specialization = { $regex: new RegExp(querySpecialization, 'i') };
      }

      const doctors = await DoctorModel.find(filter).populate('userId', 'fullName avatar').lean();
      
      // Map and rank doctors
      const recommendations = doctors.map((doc: any) => {
        let score = doc.averageRating * 10 + (doc.experience || 0) * 2;
        if (preferOnline && (doc.consultationModes || []).includes('online')) score += 15;
        
        return {
          _id: doc._id,
          fullName: doc.userId?.fullName || 'Doctor',
          avatar: doc.userId?.avatar || null,
          specialization: doc.specialization,
          experience: doc.experience,
          consultationFee: doc.consultationFee,
          averageRating: doc.averageRating,
          consultationModes: doc.consultationModes || ['clinic'],
          matchScore: Math.min(Math.round(score), 100)
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      sendSuccess(res, { recommendations }, 'Doctor recommendations fetched.');
    } catch (error) {
      next(error);
    }
  }

  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) {
        throw new ApiError('Message is required.', 400, 'VALIDATION_ERROR');
      }

      let responseText = '';

      if (GeminiModel) {
        const historyPrompt = (conversationHistory || []).map((h: any) => `${h.role}: ${h.content}`).join('\n');
        const prompt = `You are DocDock's professional AI health advisor.
Conversation history:
${historyPrompt}
Patient message: ${message}

Provide a helpful, safe, medically cautious response. NEVER give a final diagnosis. Recommend booking a doctor whenever appropriate.`;
        try {
          const result = await GeminiModel.generateContent(prompt);
          responseText = result.response.text().trim();
        } catch (e) {
          // fallback
        }
      }

      if (!responseText) {
        const msg = message.toLowerCase();
        if (msg.includes('fever')) {
          responseText = 'A fever for several days can indicate an underlying infection. I recommend tracking your temperature and drinking plenty of fluids. Please consider booking a consultation with a General Physician for a physical examination.';
        } else if (msg.includes('cough')) {
          responseText = 'A persistent cough can be caused by viral infections, allergies, or other respiratory issues. Make sure to stay warm and hydrated. If the cough lasts more than a few days, please schedule a pediatric or medical checkup.';
        } else if (msg.includes('ent') || msg.includes('ear') || msg.includes('throat')) {
          responseText = 'You should visit an ENT Specialist if you experience persistent ear pain, sinus pressure, throat discomfort, or difficulty swallowing. You can book an appointment with our ENT partners.';
        } else {
          responseText = 'I am here to help guide your health journey. Please remember that this chat does not replace professional medical advice. If you are experiencing concerning symptoms, we recommend booking a slot with one of our certified doctors.';
        }
      }

      sendSuccess(res, { response: responseText }, 'Chat response generated.');
    } catch (error) {
      next(error);
    }
  }

  async prescriptionSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medications, diagnosis, advice } = req.body;

      let summary = '';
      let dosageExplanation = '';
      let precautions = '';
      let foodRecommendations = '';
      let followUpReminder = '';

      if (GeminiModel) {
        const prompt = `Analyze this prescription:
Diagnosis: ${diagnosis || 'Not specified'}
Medications: ${JSON.stringify(medications || [])}
Doctor's advice: ${advice || 'None'}

Provide a JSON response containing:
- summary: string (brief medicine summary)
- dosageExplanation: string
- precautions: string
- foodRecommendations: string
- followUpReminder: string

Do not output code blocks or markdowns, output pure valid JSON only.`;

        try {
          const result = await GeminiModel.generateContent(prompt);
          const responseText = result.response.text().trim();
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          sendSuccess(res, parsed, 'Prescription summary generated.');
          return;
        } catch (e) {
          // fallback
        }
      }

      // Rule-based Fallback
      summary = `Prescribed medications target the diagnosed condition (${diagnosis || 'general wellness'}).`;
      dosageExplanation = (medications || []).map((m: any) => `${m.name}: ${m.dosage || 'As directed'} (${m.frequency || 'once daily'}) for ${m.duration || 'specified duration'}.`).join('\n');
      precautions = 'Finish the full course of prescribed medicines. If you experience adverse side effects, consult your doctor immediately.';
      foodRecommendations = 'Take medicines with water. Avoid heavy or oily foods unless taking medications that require high fat absorption.';
      followUpReminder = 'Please schedule a follow-up consultation in 7 days or as advised by your doctor.';

      sendSuccess(res, {
        summary,
        dosageExplanation,
        precautions,
        foodRecommendations,
        followUpReminder
      }, 'Prescription summary generated.');
    } catch (error) {
      next(error);
    }
  }
}

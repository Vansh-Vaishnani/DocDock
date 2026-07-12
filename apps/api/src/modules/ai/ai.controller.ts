import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/utils/http';
import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { DoctorModel } from '../doctor/doctor.repository';
import { UserModel } from '../auth/auth.repository';
import { PatientModel } from '../patient/patient.repository';
import { DoctorService } from '../doctor/doctor.service';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';

let GeminiModel: any = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_api_key_here') {
    const genAI = new GoogleGenerativeAI(apiKey);
    GeminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
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

      const systemPrompt = `You are Antigravity, DocDock's professional AI healthcare assistant.
Your capabilities:
- General medical guidance
- Explain symptoms in patient-friendly terms
- Explain medicines and prescriptions
- Answer healthcare questions
- Suggest lifestyle improvements
- Suggest doctor specializations
- Recommend available doctors

Rules:
1. NEVER diagnose diseases. Always include a disclaimer at the end when necessary reminding the patient that this is for informational purposes and they should consult a doctor on DocDock.
2. If the patient asks about symptoms (e.g. "I have fever and headache") or requests a type of doctor (e.g. "I need skin doctor"), suggest the appropriate doctor specialization (e.g. Dermatologist, General Physician, Pediatrician, Cardiologist, ENT Specialist).
3. If you recommend a doctor specialization, you MUST append the exact tag \`[RECOMMEND_DOCTORS: Specialization]\` (e.g., \`[RECOMMEND_DOCTORS: Dermatologist]\` or \`[RECOMMEND_DOCTORS: General Physician]\`) at the very end of your response so the system can query and list matching doctors in real-time.
4. Respond in Markdown.`;

      // Set headers for Event Stream / Streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let recommendedSpecialization = '';
      let accumulatedText = '';

      if (GeminiModel) {
        const historyPrompt = (conversationHistory || []).map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
        const finalPrompt = `${systemPrompt}\n\nConversation history:\n${historyPrompt}\nUser: ${message}\nAssistant:`;

        try {
          const resultStream = await GeminiModel.generateContentStream(finalPrompt);
          for await (const chunk of resultStream.stream) {
            const text = chunk.text();
            accumulatedText += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }

          // Check if accumulated text contains [RECOMMEND_DOCTORS: Specialization]
          const match = accumulatedText.match(/\[RECOMMEND_DOCTORS:\s*([^\]]+)\]/i);
          if (match && match[1]) {
            recommendedSpecialization = match[1].trim();
          }
        } catch (e) {
          // fallback to simulated stream below
        }
      }

      if (!GeminiModel) {
        // Simulated Stream Fallback
        let fallbackResponse = '';
        const msg = message.toLowerCase();
        if (msg.includes('fever') || msg.includes('headache') || msg.includes('cold') || msg.includes('flu') || msg.includes('cough')) {
          fallbackResponse = 'Based on your symptoms of fever, headache, or respiratory irritation, it appears you may be dealing with a common viral illness or respiratory infection. I recommend tracking your body temperature, getting ample rest, and drinking warm fluids. For a definitive diagnosis and treatment plan, consulting a **General Physician** is highly recommended.\n\n*Disclaimer: This is general guidance. Please seek a professional medical opinion on DocDock.*\n\n[RECOMMEND_DOCTORS: General Physician]';
          recommendedSpecialization = 'General Physician';
        } else if (msg.includes('skin') || msg.includes('rash') || msg.includes('acne') || msg.includes('itch') || msg.includes('dermatologist')) {
          fallbackResponse = 'For skin concerns, dermatological rashes, acne outbreaks, or localized allergic reactions, a **Dermatologist** is the specialist best equipped to diagnose and suggest targeted treatments.\n\n*Disclaimer: This is general guidance. Please seek a professional medical opinion on DocDock.*\n\n[RECOMMEND_DOCTORS: Dermatologist]';
          recommendedSpecialization = 'Dermatologist';
        } else if (msg.includes('child') || msg.includes('baby') || msg.includes('pediatric') || msg.includes('kid')) {
          fallbackResponse = 'For health concerns relating to infants, children, or adolescents, you should seek guidance from a **Pediatrician** who specializes in early development and childhood illnesses.\n\n*Disclaimer: This is general guidance. Please seek a professional medical opinion on DocDock.*\n\n[RECOMMEND_DOCTORS: Pediatrician]';
          recommendedSpecialization = 'Pediatrician';
        } else if (msg.includes('heart') || msg.includes('chest') || msg.includes('bp') || msg.includes('cardio')) {
          fallbackResponse = 'For symptoms like chest tightness, breathing difficulties, high blood pressure, or heart rate irregularities, it is critical to consult a **Cardiologist** immediately.\n\n*Disclaimer: This is general guidance. If you are experiencing a medical emergency, go to the nearest ER.*\n\n[RECOMMEND_DOCTORS: Cardiologist]';
          recommendedSpecialization = 'Cardiologist';
        } else if (msg.includes('ear') || msg.includes('nose') || msg.includes('throat') || msg.includes('ent') || msg.includes('sinus')) {
          fallbackResponse = 'For issues involving earaches, nasal congestion, throat pain, sinus infections, or hearing disturbances, an **ENT Specialist** (Otolaryngologist) is the most suitable medical expert.\n\n*Disclaimer: This is general guidance. Please seek a professional medical opinion on DocDock.*\n\n[RECOMMEND_DOCTORS: ENT Specialist]';
          recommendedSpecialization = 'ENT Specialist';
        } else if (msg.includes('stomach') || msg.includes('pain') || msg.includes('digestion') || msg.includes('diarrhea') || msg.includes('vomit')) {
          fallbackResponse = 'Abdominal pain, digestion issues, persistent acid reflux, or gastrointestinal disturbances are best evaluated by a **Gastroenterologist** or a **General Physician**.\n\n*Disclaimer: This is general guidance. Please seek a professional medical opinion on DocDock.*\n\n[RECOMMEND_DOCTORS: General Physician]';
          recommendedSpecialization = 'General Physician';
        } else {
          fallbackResponse = `Hello! I am Antigravity, your DocDock AI Healthcare Assistant. I am here to help guide you on symptoms, medications, or connect you with clinical specialists.\n\nCould you please describe what symptoms you are experiencing? E.g., "I have a skin rash" or "My child has a fever". I will analyze it and suggest the right specialist nearby.\n\n*Disclaimer: I provide information, not medical diagnoses.*`;
        }

        const words = fallbackResponse.split(' ');
        for (const word of words) {
          res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
          await new Promise(r => setTimeout(r, 20));
        }
      }

      // If doctor recommendation is triggered, fetch actual doctors and append to stream
      if (recommendedSpecialization) {
        // Strip out the bracket tag in UI if we want, but since we outputted it,
        // let's fetch the doctors and append the GFM Markdown table.
        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const patient = await PatientModel.findOne({ userId: (req as AuthenticatedRequest).user?.sub });
          const defaultAddress = patient?.addresses?.find(a => a.isDefault) || patient?.addresses?.[0];
          if (defaultAddress?.location?.coordinates) {
            lng = defaultAddress.location.coordinates[0];
            lat = defaultAddress.location.coordinates[1];
          }
        } catch (err) {
          // Ignore location fetch errors
        }

        try {
          const doctorService = new DoctorService();
          const doctors = await doctorService.searchNearby(lat, lng, 25000, recommendedSpecialization, { limit: 3 });

          if (doctors && doctors.length > 0) {
            let doctorMd = '\n\n### Recommended Doctors\n\n| Doctor Name | Rating | Distance | Consultation | Availability | Action |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n';
            for (const doc of doctors) {
              const d = doc as any;
              const name = d.fullName || `Dr. ${d.specialization || recommendedSpecialization}`;
              const rating = typeof d.averageRating === 'number' ? d.averageRating.toFixed(1) : '0.0';
              const dist = typeof d.distance === 'number' ? `${(d.distance / 1000).toFixed(1)} km` : '—';
              const type = Array.isArray(d.consultationModes) ? d.consultationModes.map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(' • ') : 'Clinic';
              const avail = d.availability?.isAvailable ? 'Available Today' : 'On Request';
              const bookingLink = `[Book Now](/find-doctors/${d._id})`;

              doctorMd += `| **${name}** | ⭐ ${rating} | 📍 ${dist} | ${type} | 🟢 ${avail} | ${bookingLink} |\n`;
            }

            res.write(`data: ${JSON.stringify({ text: doctorMd })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ text: `\n\n*No available ${recommendedSpecialization}s found nearby at the moment.*` })}\n\n`);
          }
        } catch (err) {
          res.write(`data: ${JSON.stringify({ text: `\n\n*Unable to retrieve recommended doctors right now.*` })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
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

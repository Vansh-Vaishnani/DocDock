import { z } from 'zod';



const timeSlotSchema = z.object({

  start: z.string().regex(/^\d{2}:\d{2}$/),

  end: z.string().regex(/^\d{2}:\d{2}$/)

});



const locationSchema = z.object({

  type: z.literal('Point'),

  coordinates: z.tuple([z.number(), z.number()])

});



export const nearbyDoctorsSchema = z.object({

  query: z.object({

    latitude: z.string().optional().transform((val) => (val ? Number(val) : undefined)),

    longitude: z.string().optional().transform((val) => (val ? Number(val) : undefined)),

    radius: z.string().optional().transform((val) => (val ? Number(val) : 10000)),

    specialization: z.string().optional()

  })

});



export const availabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean().optional(),
    workingDays: z.array(z.string()).optional(),
    morningSlot: timeSlotSchema.optional(),
    eveningSlot: timeSlotSchema.optional(),
    breakTime: timeSlotSchema.optional(),
    vacationMode: z.boolean().optional(),
    maxAppointmentsPerDay: z.number().int().min(1).max(50).optional(),
    slotDuration: z.number().int().min(5).max(240).optional(),
    perDaySchedule: z.record(z.object({
      enabled: z.boolean(),
      slots: z.array(z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/)
      }))
    })).optional()
  })
});



export const doctorProfileSchema = z.object({

  body: z.object({

    licenseNumber: z.string().min(3),

    specialization: z.string().min(3),

    qualifications: z.array(z.string().min(2)).min(1),

    experience: z.number().int().min(0),

    bio: z.string().min(10).max(500),

    languages: z.array(z.string().min(2)).min(1),

    consultationFee: z.number().int().min(0),

    location: locationSchema,

    clinicAddress: z.string().optional(),

    serviceRadius: z.number().optional(),

    consultationType: z.enum(['home', 'clinic', 'both']).optional(),
    consultationModes: z.array(z.enum(['clinic', 'home', 'online'])).min(1).optional()

  })

});



export const doctorRegisterSchema = z.object({

  body: z.object({

    fullName: z.string().min(2).max(100),

    email: z.string().email(),

    phone: z.string().min(10),

    password: z.string().min(8),

    gender: z.enum(['male', 'female', 'other']),

    dateOfBirth: z.string().min(1),

    qualification: z.string().min(2),

    medicalDegree: z.string().min(2),

    licenseNumber: z.string().min(3),

    experience: z.coerce.number().int().min(0),

    specialization: z.string().min(2),

    consultationFee: z.coerce.number().int().min(0),

    languages: z.array(z.string().min(2)).min(1),

    clinicName: z.string().min(2),

    bio: z.string().min(10).max(1000),

    location: locationSchema.optional(),

    clinicAddress: z.string().optional(),

    serviceRadius: z.number().optional(),

    consultationType: z.enum(['home', 'clinic', 'both']).optional(),
    consultationModes: z.array(z.enum(['clinic', 'home', 'online'])).min(1).optional(),

    profilePhoto: z.string().optional(),

    governmentId: z.string().optional(),

    medicalLicense: z.string().optional()

  })

});



export const updateDoctorProfileSchema = z.object({

  body: z.object({

    fullName: z.string().min(2).max(100).optional(),

    email: z.string().email().optional(),

    phone: z.string().min(10).optional(),

    specialization: z.string().min(2).optional(),

    qualification: z.string().min(2).optional(),

    medicalDegree: z.string().min(2).optional(),

    licenseNumber: z.string().min(3).optional(),

    experience: z.number().int().min(0).optional(),

    bio: z.string().max(1000).optional(),

    languages: z.array(z.string().min(2)).optional(),

    consultationFee: z.number().int().min(0).optional(),

    gender: z.enum(['male', 'female', 'other']).optional(),

    dateOfBirth: z.string().optional(),

    clinicName: z.string().min(2).optional(),

    location: locationSchema.optional(),

    clinicAddress: z.string().optional(),

    serviceRadius: z.number().optional(),

    consultationType: z.enum(['home', 'clinic', 'both']).optional(),
    consultationModes: z.array(z.enum(['clinic', 'home', 'online'])).min(1).optional(),

    profilePhoto: z.string().optional(),

    governmentId: z.string().optional(),

    medicalLicense: z.string().optional()

  })

});



export const doctorAppointmentsSchema = z.object({

  query: z.object({

    filter: z.enum(['today', 'upcoming', 'all']).optional().default('all')

  })

});



export const uploadDocumentSchema = z.object({

  body: z.object({

    documentType: z.enum(['profilePhoto', 'governmentId', 'medicalLicense'])

  })

});


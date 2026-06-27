import { redirect } from 'next/navigation';

export default function DoctorDetailsRedirect({ params }: { params: { id: string } }) {
  redirect(`/find-doctors/${params.id}`);
}

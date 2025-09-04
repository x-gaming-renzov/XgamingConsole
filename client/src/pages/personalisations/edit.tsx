import PersonalisationForm from './form';
import { useRoute } from 'wouter';

export default function EditPersonalisation() {
    const [match, params] = useRoute('/personalisations/edit/:id');
    return <PersonalisationForm mode="edit" personalisationId={params?.id} />;
}

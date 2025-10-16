import { Card } from '@/components/ui/card';
import { Shield } from 'lucide-react';

/**
 * Privacy page - GDPR privacy policy
 * Single column layout with prose styling
 */
export default function Privacy() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold mb-4" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Content */}
        <Card className="p-8 md:p-12">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold mb-4">1. Introduzione</h2>
            <p className="text-muted-foreground mb-6">
              VR Theatre è impegnata a proteggere la privacy dei nostri utenti.
              Questa Privacy Policy spiega come raccogliamo, utilizziamo e proteggiamo le tue
              informazioni personali in conformità con il GDPR (Regolamento Generale sulla Protezione dei Dati).
            </p>

            <h2 className="text-2xl font-semibold mb-4">2. Dati Raccolti</h2>
            <p className="text-muted-foreground mb-4">
              Raccogliamo le seguenti informazioni quando ti registri o utilizzi i nostri servizi:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
              <li>Nome completo</li>
              <li>Indirizzo email</li>
              <li>Nome del teatro (opzionale per utenti standard, obbligatorio per venditori)</li>
              <li>Immagine del profilo (opzionale)</li>
              <li>Preferenze di visualizzazione e cronologia</li>
              <li>Informazioni di pagamento (tramite Stripe per venditori)</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">3. Utilizzo dei Dati</h2>
            <p className="text-muted-foreground mb-4">
              Utilizziamo i tuoi dati personali per:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
              <li>Fornire e migliorare i nostri servizi VR Theatre</li>
              <li>Personalizzare la tua esperienza utente</li>
              <li>Processare pagamenti per venditori tramite Stripe</li>
              <li>Comunicare aggiornamenti e novità sui contenuti</li>
              <li>Garantire la sicurezza e prevenire frodi</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">4. Base Legale (GDPR)</h2>
            <p className="text-muted-foreground mb-6">
              Processiamo i tuoi dati personali sulla base del consenso che ci fornisci durante la
              registrazione. Hai il diritto di revocare il consenso in qualsiasi momento.
            </p>

            <h2 className="text-2xl font-semibold mb-4">5. Condivisione dei Dati</h2>
            <p className="text-muted-foreground mb-4">
              I tuoi dati personali vengono condivisi solo con:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
              <li>Stripe (per processare pagamenti di venditori)</li>
              <li>Fornitori di servizi cloud per hosting sicuro</li>
              <li>Autorità legali quando richiesto dalla legge</li>
            </ul>
            <p className="text-muted-foreground mb-6">
              Non vendiamo né affittiamo i tuoi dati a terze parti per scopi di marketing.
            </p>

            <h2 className="text-2xl font-semibold mb-4">6. I Tuoi Diritti (GDPR)</h2>
            <p className="text-muted-foreground mb-4">
              In conformità con il GDPR, hai i seguenti diritti:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-2">
              <li><strong>Accesso:</strong> Richiedere una copia dei tuoi dati personali</li>
              <li><strong>Rettifica:</strong> Correggere dati inesatti o incompleti</li>
              <li><strong>Cancellazione:</strong> Richiedere la cancellazione dei tuoi dati ("diritto all'oblio")</li>
              <li><strong>Limitazione:</strong> Limitare il trattamento dei tuoi dati</li>
              <li><strong>Portabilità:</strong> Ricevere i tuoi dati in formato strutturato</li>
              <li><strong>Opposizione:</strong> Opporti al trattamento dei tuoi dati</li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4">7. Sicurezza dei Dati</h2>
            <p className="text-muted-foreground mb-6">
              Implementiamo misure di sicurezza tecniche e organizzative appropriate per proteggere
              i tuoi dati personali da accesso non autorizzato, perdita o distruzione. Tutti i dati
              sono crittografati in transito (HTTPS) e a riposo.
            </p>

            <h2 className="text-2xl font-semibold mb-4">8. Conservazione dei Dati</h2>
            <p className="text-muted-foreground mb-6">
              Conserviamo i tuoi dati personali solo per il tempo necessario a fornire i nostri servizi
              o come richiesto dalla legge. Puoi richiedere la cancellazione del tuo account in qualsiasi momento.
            </p>

            <h2 className="text-2xl font-semibold mb-4">9. Cookie e Tecnologie Simili</h2>
            <p className="text-muted-foreground mb-6">
              Utilizziamo cookie essenziali per garantire il funzionamento del sito. I cookie di sessione
              vengono eliminati quando chiudi il browser. Puoi gestire le preferenze dei cookie nelle
              impostazioni del tuo browser.
            </p>

            <h2 className="text-2xl font-semibold mb-4">10. Modifiche alla Privacy Policy</h2>
            <p className="text-muted-foreground mb-6">
              Ci riserviamo il diritto di aggiornare questa Privacy Policy. Ti informeremo di eventuali
              modifiche sostanziali tramite email o notifica sul sito.
            </p>

            <h2 className="text-2xl font-semibold mb-4">11. Contatti</h2>
            <p className="text-muted-foreground mb-2">
              Per esercitare i tuoi diritti o per domande sulla privacy, contattaci:
            </p>
            <ul className="list-none text-muted-foreground space-y-2">
              <li><strong>Email:</strong> privacy@vrtheatre.com</li>
              <li><strong>Indirizzo:</strong> Via del Teatro 123, Milano, Italia</li>
              <li><strong>DPO:</strong> dpo@vrtheatre.com</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

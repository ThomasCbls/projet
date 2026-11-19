"use client";

import CloudSyncOutlined from "@mui/icons-material/CloudSyncOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chargement, EnTetePage, Section } from "@/components/ui";
import { useSession } from "@/hooks/useSession";

type Mode = "connexion" | "inscription";

export default function PageConnexion() {
  const { disponible, pret, utilisateur, connexion, inscription } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!pret) return <Chargement />;

  if (!disponible) {
    return (
      <>
        <EnTetePage titre="Connexion" />
        <Alert severity="info">
          La synchronisation n&apos;est pas configurée pour cette installation. Les données restent enregistrées sur
          cet appareil.
        </Alert>
      </>
    );
  }

  if (utilisateur) {
    return (
      <>
        <EnTetePage titre="Connexion" />
        <Section>
          <Typography sx={{ mb: 2 }}>
            Connecté avec <strong>{utilisateur.email}</strong>. Vos données sont synchronisées sur vos appareils.
          </Typography>
          <Button component={Link} href="/" variant="contained">
            Aller au tableau de bord
          </Button>
        </Section>
      </>
    );
  }

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setInfo(null);
    setEnvoi(true);
    try {
      if (mode === "connexion") {
        await connexion(email, motDePasse);
        router.push("/");
      } else if ((await inscription(email, motDePasse)) === "connecte") {
        router.push("/");
      } else {
        setInfo("Compte créé. Ouvrez le lien reçu par e-mail pour le confirmer, puis connectez-vous.");
        setMode("connexion");
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <EnTetePage titre="Connexion" sousTitre="Retrouvez vos saisies sur votre téléphone et votre ordinateur." />
      <Box sx={{ maxWidth: 460 }}>
        <Section>
          <Tabs
            value={mode}
            onChange={(_, v: Mode) => {
              setMode(v);
              setErreur(null);
            }}
            variant="fullWidth"
            sx={{ mb: 2.5 }}
          >
            <Tab value="connexion" label="Se connecter" />
            <Tab value="inscription" label="Créer un compte" />
          </Tabs>

          <Box component="form" onSubmit={valider} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              type="email"
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
            <TextField
              type="password"
              label="Mot de passe"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete={mode === "connexion" ? "current-password" : "new-password"}
              helperText={mode === "inscription" ? "6 caractères minimum." : undefined}
              slotProps={{ htmlInput: { minLength: 6 } }}
              required
            />
            {erreur && <Alert severity="error">{erreur}</Alert>}
            {info && <Alert severity="success">{info}</Alert>}
            <Button type="submit" variant="contained" size="large" loading={envoi} startIcon={<CloudSyncOutlined />}>
              {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2.5, color: "text.secondary" }}>
            Les jours déjà saisis sur cet appareil sont conservés et ajoutés à votre compte. Si un même jour existe déjà
            en ligne, c&apos;est la version en ligne qui est gardée.
          </Typography>
        </Section>
      </Box>
    </>
  );
}

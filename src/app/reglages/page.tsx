"use client";

import DeleteForeverOutlined from "@mui/icons-material/DeleteForeverOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { ChoixTheme } from "@/components/Theme";
import { Chargement, EnTetePage, Section } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { aujourdhuiIso, estDansPeriode, estDateIso, finPeriode, joursActifs } from "@/lib/dates";
import { formatDateCourte } from "@/lib/format";
import { ErreurImport, exporterJSON, importerJSON } from "@/lib/storage";
import type { AppData } from "@/lib/types";

function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export default function PageReglages() {
  const { data, setDateDebut, remplacer, reinitialiser } = useDonnees();
  const fichier = useRef<HTMLInputElement>(null);
  const [importEnAttente, setImportEnAttente] = useState<AppData | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; texte: string } | null>(null);
  const [confirmerReset, setConfirmerReset] = useState(false);

  if (!data) return <Chargement />;

  const nbJoursSaisis = Object.keys(data.jours).length;
  const horsPeriode = Object.keys(data.jours).filter((d) => !estDansPeriode(d, data.dateDebut)).length;

  const surFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setImportEnAttente(importerJSON(await f.text()));
    } catch (err) {
      setImportEnAttente(null);
      setMessage({ type: "error", texte: err instanceof ErreurImport ? err.message : "Import impossible." });
    }
  };

  return (
    <>
      <EnTetePage titre="Réglages" />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Section titre="Période de suivi">
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
              <TextField
                type="date"
                label="Date de début de saisie"
                value={data.dateDebut}
                onChange={(e) => estDateIso(e.target.value) && setDateDebut(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: 220 }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Fin :{" "}
                <Box component="strong" sx={{ color: "text.primary" }}>
                  {formatDateCourte(finPeriode(data.dateDebut))}
                </Box>{" "}
                (début + 1 an − 1 jour) · {joursActifs(data.dateDebut).length} jours suivis.
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Les saisies restent attachées à leur date : changer le début ne les décale pas. Les jours hors période sont
              conservés mais masqués
              {horsPeriode > 0 && ` (${pluriel(horsPeriode, "jour")} actuellement)`}.
            </Typography>
          </Section>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Section titre="Apparence" sousTitre="« Système » suit le réglage clair / sombre de l'appareil.">
            <ChoixTheme />
          </Section>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Section titre="Sauvegarde des données">
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              Les données sont enregistrées dans ce navigateur uniquement ({pluriel(nbJoursSaisis, "jour")} saisi
              {nbJoursSaisis > 1 ? "s" : ""}). Exportez-les régulièrement pour les sauvegarder ou les transférer sur un
              autre appareil.
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<FileDownloadOutlined />}
                onClick={() => {
                  telecharger(`suivi-sport-${aujourdhuiIso()}.json`, exporterJSON(data));
                  setMessage({ type: "success", texte: "Export JSON téléchargé." });
                }}
              >
                Exporter en JSON
              </Button>
              <Button variant="outlined" startIcon={<FileUploadOutlined />} onClick={() => fichier.current?.click()}>
                Importer un JSON
              </Button>
              <input
                ref={fichier}
                type="file"
                accept="application/json,.json"
                hidden
                tabIndex={-1}
                aria-label="Fichier JSON à importer"
                onChange={surFichier}
              />
            </Box>
          </Section>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Section titre="Réinitialiser">
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              Efface toutes les saisies de ce navigateur et remet la date de début par défaut. Pensez à exporter avant.
            </Typography>
            <Button variant="outlined" color="error" startIcon={<DeleteForeverOutlined />} onClick={() => setConfirmerReset(true)}>
              Réinitialiser les données…
            </Button>
          </Section>
        </Grid>
      </Grid>

      {/* Confirmation d'import */}
      <Dialog open={importEnAttente !== null} onClose={() => setImportEnAttente(null)} aria-labelledby="titre-import">
        <DialogTitle id="titre-import">Remplacer les données actuelles ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le fichier contient {pluriel(Object.keys(importEnAttente?.jours ?? {}).length, "jour")} saisi(s), début le{" "}
            {importEnAttente && formatDateCourte(importEnAttente.dateDebut)}. Les données actuelles seront remplacées.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportEnAttente(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (importEnAttente) remplacer(importEnAttente);
              setImportEnAttente(null);
              setMessage({ type: "success", texte: "Données importées." });
            }}
          >
            Remplacer mes données
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation de réinitialisation */}
      <Dialog open={confirmerReset} onClose={() => setConfirmerReset(false)} aria-labelledby="titre-reset">
        <DialogTitle id="titre-reset">Supprimer définitivement {pluriel(nbJoursSaisis, "jour")} de saisie ?</DialogTitle>
        <DialogContent>
          <DialogContentText>Cette action est irréversible. Pensez à exporter vos données avant.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmerReset(false)} autoFocus>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await reinitialiser();
              setConfirmerReset(false);
              setMessage({ type: "success", texte: "Données réinitialisées." });
            }}
          >
            Oui, tout supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={message !== null}
        autoHideDuration={message?.type === "error" ? null : 4000}
        onClose={(_, raison) => raison !== "clickaway" && setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 88, md: 24 } }}
      >
        {message ? (
          <Alert severity={message.type} variant="filled" onClose={() => setMessage(null)} sx={{ width: "100%" }}>
            {message.texte}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}

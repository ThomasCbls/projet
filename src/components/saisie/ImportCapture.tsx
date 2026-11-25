"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DocumentScannerRounded from "@mui/icons-material/DocumentScannerRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import type { SxProps, Theme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDonnees } from "@/hooks/useDonnees";
import { aujourdhuiIso, estDansPeriode, finPeriode } from "@/lib/dates";
import { formatDateCourte } from "@/lib/format";
import {
  type ChampCapture,
  type PariAImporter,
  type SelectionDetectee,
  analyserTexteCapture,
  appliquerImport,
  verifierImport,
} from "@/lib/lectureCapture";
import { type SportPariId, type TypeJour, NB_PARIS_MAX, SPORTS_PARIS } from "@/lib/types";
import { ChampNombre } from "../ui";
import { ChoixResultat } from "./LignePari";

/** Cache où le service worker dépose l'image partagée (voir app/sw.ts). */
const CACHE_PARTAGE = "bt-partage";
const CLE_PARTAGE = "/partage/image";

type Brouillon = PariAImporter & { date: string };

type Etat =
  | { phase: "inactif" }
  | { phase: "lecture"; progres: number }
  | { phase: "erreur"; message: string }
  | { phase: "verification"; brouillon: Brouillon; aVerifier: Set<ChampCapture> };

/** Contour orange des champs que l'OCR n'a pas pu lire avec certitude. */
const styleAVerifier: SxProps<Theme> = {
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "warning.main", borderWidth: 2 },
};
const siDouteux = (douteux: boolean): SxProps<Theme> => (douteux ? styleAVerifier : {});

/** Zone d'import en pointillés : violette au survol, au focus clavier et quand une image la survole. */
const zoneImport: SxProps<Theme> = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: { xs: 1.5, sm: 2 },
  px: { xs: 2, sm: 2.5 },
  py: { xs: 2, sm: 2.25 },
  borderRadius: "16px",
  border: "2px dashed",
  borderColor: "bt.lineStrong",
  bgcolor: "color-mix(in srgb, var(--mui-palette-bt-violet) 4%, transparent)",
  color: "text.primary",
  transition: "border-color 150ms, background-color 150ms, transform 80ms",
  // Le survol par glisser-déposer ne doit pas clignoter en passant sur l'icône ou le texte.
  "& > *": { pointerEvents: "none" },
  "& .icone": {
    flexShrink: 0,
    width: { xs: 44, sm: 52 },
    height: { xs: 44, sm: 52 },
    display: "grid",
    placeItems: "center",
    borderRadius: "14px",
    bgcolor: "bt.violetSoft",
    color: "bt.violetText",
    transition: "transform 150ms",
    "& svg": { fontSize: { xs: 24, sm: 28 } },
  },
  "& .action": {
    flexShrink: 0,
    display: { xs: "none", sm: "inline-flex" },
    alignItems: "center",
    gap: 0.5,
    px: 1.75,
    py: 0.75,
    borderRadius: "12px",
    fontWeight: 700,
    fontSize: "0.875rem",
    color: "bt.violetText",
    border: 1,
    borderColor: "bt.lineStrong",
    bgcolor: "bt.surfaceRaised",
    transition: "border-color 150ms",
  },
  "&:hover, &.Mui-focusVisible, &[data-survol]": {
    borderColor: "primary.main",
    bgcolor: "color-mix(in srgb, var(--mui-palette-bt-violet) 10%, transparent)",
    "& .icone": { transform: "scale(1.06)" },
    "& .action": { borderColor: "primary.main" },
  },
  "&:active": { transform: "scale(0.99)" },
  "&.Mui-disabled": { opacity: 0.6 },
};

const selectionVide = (): SelectionDetectee => ({ equipes: "", sport: "", cote: null });

/**
 * Bouton « Importer une capture » : lit une capture d'écran de pari (OCR local), propose les
 * valeurs détectées dans une fenêtre de vérification, puis ajoute le pari au jour choisi.
 * Reçoit aussi les images partagées depuis une autre application (Android, `/saisie?import=partage`).
 */
export function ImportCapture({ date, allerA }: { date: string; allerA: (d: string) => void }) {
  const { data, lireJour, majJour } = useDonnees();
  const params = useSearchParams();
  const debut = data?.dateDebut ?? date;
  const fin = finPeriode(debut);
  const [etat, setEtat] = useState<Etat>({ phase: "inactif" });
  const [apercu, setApercu] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [erreurAjout, setErreurAjout] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const entree = useRef<HTMLInputElement>(null);
  const partageTraite = useRef(false);

  // Libère l'URL de l'aperçu quand elle change ou au démontage.
  useEffect(() => () => void (apercu && URL.revokeObjectURL(apercu)), [apercu]);

  const lire = useCallback(
    async (image: Blob) => {
      setErreurAjout(null);
      setApercu(URL.createObjectURL(image));
      setEtat({ phase: "lecture", progres: 0 });
      try {
        const { lireCapture } = await import("@/lib/ocr");
        const texte = await lireCapture(image, (progres) => setEtat({ phase: "lecture", progres }));
        const p = analyserTexteCapture(texte, aujourdhuiIso());
        setEtat({
          phase: "verification",
          brouillon: {
            date: p.date ?? date,
            type: p.type,
            mise: p.mise,
            cote: p.cote,
            resultat: p.resultat,
            selections: p.type === "combine" && p.selections.length < 2 ? [...p.selections, selectionVide()] : p.selections,
          },
          aVerifier: new Set(p.aVerifier),
        });
      } catch (e) {
        console.error(e);
        setEtat({
          phase: "erreur",
          message: navigator.onLine
            ? "La capture n'a pas pu être lue. Essaie avec une image plus nette, ou saisis le pari à la main."
            : "Lecture impossible hors connexion : au premier usage, le moteur de lecture (environ 5 Mo) doit être téléchargé.",
        });
      }
    },
    [date],
  );

  // Image partagée depuis une autre application : déposée en cache par le service worker.
  useEffect(() => {
    if (params.get("import") !== "partage" || partageTraite.current || !("caches" in window)) return;
    partageTraite.current = true;
    allerA(date); // retire « import » de l'adresse
    (async () => {
      const cache = await caches.open(CACHE_PARTAGE);
      const reponse = await cache.match(CLE_PARTAGE);
      await cache.delete(CLE_PARTAGE);
      if (reponse) await lire(await reponse.blob());
      else setEtat({ phase: "erreur", message: "L'image partagée est introuvable. Réessaie depuis le bouton « Importer une capture »." });
    })();
  }, [params, allerA, date, lire]);

  const fermer = () => {
    setEtat({ phase: "inactif" });
    setApercu(null);
    setErreurAjout(null);
  };

  const modifier = (champ: ChampCapture | null, modif: Partial<Brouillon>) =>
    setEtat((e) => {
      if (e.phase !== "verification") return e;
      const aVerifier = new Set(e.aVerifier);
      if (champ) aVerifier.delete(champ);
      return { ...e, brouillon: { ...e.brouillon, ...modif }, aVerifier };
    });

  const brouillon = etat.phase === "verification" ? etat.brouillon : null;
  const aVerifier = etat.phase === "verification" ? etat.aVerifier : new Set<ChampCapture>();
  const combine = brouillon?.type === "combine";

  const majSelection = (i: number, modif: Partial<SelectionDetectee>) =>
    brouillon && modifier(null, { selections: brouillon.selections.map((s, k) => (k === i ? { ...s, ...modif } : s)) });

  const changerType = (type: TypeJour) => {
    if (!brouillon) return;
    const selections =
      type === "simple"
        ? brouillon.selections.slice(0, 1)
        : brouillon.selections.length < 2
          ? [...brouillon.selections, selectionVide()]
          : brouillon.selections;
    modifier(null, { type, selections });
  };

  const horsPeriode = brouillon !== null && !estDansPeriode(brouillon.date, debut);
  const bloquant = brouillon ? (horsPeriode ? "Cette date est en dehors de la période de suivi." : verifierImport(brouillon)) : null;

  const ajouter = () => {
    if (!brouillon || bloquant) return;
    const cible = brouillon.date;
    const r = appliquerImport(lireJour(cible), brouillon);
    if ("erreur" in r) {
      setErreurAjout(r.erreur);
      return;
    }
    majJour(cible, (j) => {
      const maj = appliquerImport(j, brouillon);
      return "erreur" in maj ? j : maj.jour;
    });
    if (cible !== date) allerA(cible);
    setConfirmation(`Pari ajouté au ${formatDateCourte(cible)}.`);
    fermer();
  };

  return (
    <>
      <ButtonBase
        onClick={() => entree.current?.click()}
        disabled={etat.phase === "lecture"}
        data-survol={survol || undefined}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
          if (f) lire(f);
        }}
        sx={zoneImport}
      >
        <Box className="icone" aria-hidden="true">
          <DocumentScannerRounded />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <Typography component="span" sx={{ display: "block", fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>
            Importer une capture de pari
          </Typography>
          <Typography component="span" variant="body2" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
            <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
              Glisse une image ici ou clique pour la choisir.{" "}
            </Box>
            <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
              Touche pour choisir une image.{" "}
            </Box>
            Mise, cote et résultat sont lus sur ton appareil.
          </Typography>
        </Box>
        <Box className="action" aria-hidden="true">
          <AddRounded fontSize="small" />
          Choisir
        </Box>
      </ButtonBase>
      <input
        ref={entree}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // permet de choisir à nouveau la même image
          if (f) lire(f);
        }}
      />

      <Dialog open={etat.phase !== "inactif"} onClose={etat.phase === "lecture" ? undefined : fermer} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          {etat.phase === "verification" ? "Vérifier le pari importé" : "Lecture de la capture"}
          {etat.phase !== "lecture" && (
            <IconButton aria-label="Fermer" onClick={fermer} sx={{ position: "absolute", right: 12, top: 12 }}>
              <CloseRounded />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2 }}>
          {apercu && (
            <Box
              component="img"
              src={apercu}
              alt="Capture importée"
              sx={{
                maxHeight: etat.phase === "verification" ? 180 : 320,
                maxWidth: "100%",
                justifySelf: "center",
                borderRadius: "12px",
                border: 1,
                borderColor: "bt.lineStrong",
              }}
            />
          )}

          {etat.phase === "lecture" && (
            <Box aria-live="polite">
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Lecture en cours, directement sur l&apos;appareil…
              </Typography>
              <LinearProgress variant="determinate" value={etat.progres * 100} aria-label="Avancement de la lecture" />
            </Box>
          )}

          {etat.phase === "erreur" && <Alert severity="error">{etat.message}</Alert>}

          {brouillon && (
            <>
              <Alert severity={aVerifier.size > 0 ? "warning" : "info"}>
                {aVerifier.size > 0
                  ? "Les champs en orange n'ont pas pu être lus avec certitude : vérifie-les avant d'ajouter le pari."
                  : "Vérifie les informations lues avant d'ajouter le pari."}
              </Alert>

              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <TextField
                  type="date"
                  label="Date"
                  value={brouillon.date}
                  onChange={(e) => e.target.value && modifier("date", { date: e.target.value })}
                  error={horsPeriode}
                  sx={siDouteux(aVerifier.has("date"))}
                  slotProps={{ htmlInput: { min: debut, max: fin }, inputLabel: { shrink: true } }}
                />
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  color="primary"
                  size="small"
                  value={brouillon.type}
                  onChange={(_, t: TypeJour | null) => t && changerType(t)}
                  aria-label="Type de pari"
                  sx={{ height: 40, alignSelf: "end" }}
                >
                  <ToggleButton value="simple">Simple</ToggleButton>
                  <ToggleButton value="combine">Combiné</ToggleButton>
                </ToggleButtonGroup>
                <ChampNombre
                  libelle={combine ? "Mise du combiné" : "Mise"}
                  suffixe="€"
                  valeur={brouillon.mise}
                  onChange={(mise) => modifier("mise", { mise })}
                  sx={siDouteux(aVerifier.has("mise"))}
                />
                <ChampNombre
                  libelle={combine ? "Cote totale (indicative)" : "Cote"}
                  valeur={brouillon.cote}
                  onChange={(cote) => modifier("cote", { cote })}
                  sx={siDouteux(aVerifier.has("cote"))}
                />
                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    ...(aVerifier.has("resultat") && {
                      "& .MuiToggleButtonGroup-root": { outline: 2, outlineColor: "warning.main", borderRadius: "12px" },
                    }),
                  }}
                >
                  <ChoixResultat valeur={brouillon.resultat} onChange={(resultat) => modifier("resultat", { resultat })} />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gap: 1.5 }}>
                {brouillon.selections.map((s, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      alignItems: "center",
                      gridTemplateColumns: combine ? "minmax(0,1fr) 7.5rem 5.5rem auto" : "minmax(0,1fr) 8rem",
                    }}
                  >
                    <TextField
                      label={combine ? `Sélection ${i + 1}` : "Équipes / pari"}
                      multiline
                      value={s.equipes}
                      onChange={(e) => majSelection(i, { equipes: e.target.value })}
                      sx={siDouteux(s.equipes.trim() === "")}
                    />
                    <TextField
                      select
                      label="Sport"
                      value={s.sport}
                      onChange={(e) => majSelection(i, { sport: e.target.value as SportPariId | "" })}
                      sx={siDouteux(s.sport === "")}
                    >
                      <MenuItem value="">–</MenuItem>
                      {SPORTS_PARIS.map((sp) => (
                        <MenuItem key={sp.id} value={sp.id}>
                          {sp.nom}
                        </MenuItem>
                      ))}
                    </TextField>
                    {combine && (
                      <>
                        <ChampNombre
                          libelle="Cote"
                          valeur={s.cote}
                          onChange={(cote) => majSelection(i, { cote })}
                          sx={siDouteux(s.cote === null)}
                        />
                        <IconButton
                          aria-label={`Retirer la sélection ${i + 1}`}
                          disabled={brouillon.selections.length <= 2}
                          onClick={() => modifier(null, { selections: brouillon.selections.filter((_, k) => k !== i) })}
                        >
                          <CloseRounded />
                        </IconButton>
                      </>
                    )}
                  </Box>
                ))}
                {combine && (
                  <Button
                    size="small"
                    startIcon={<AddRounded />}
                    onClick={() => modifier(null, { selections: [...brouillon.selections, selectionVide()] })}
                    disabled={brouillon.selections.length >= NB_PARIS_MAX}
                    sx={{ justifySelf: "start" }}
                  >
                    Ajouter une sélection
                  </Button>
                )}
              </Box>

              {(bloquant || erreurAjout) && <Alert severity="error">{bloquant ?? erreurAjout}</Alert>}
            </>
          )}
        </DialogContent>
        {etat.phase !== "lecture" && (
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={fermer}>{brouillon ? "Annuler" : "Fermer"}</Button>
            {brouillon && (
              <Button variant="contained" onClick={ajouter} disabled={bloquant !== null}>
                Ajouter au {formatDateCourte(brouillon.date)}
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>

      <Snackbar
        open={confirmation !== null}
        autoHideDuration={4000}
        onClose={() => setConfirmation(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setConfirmation(null)}>
          {confirmation}
        </Alert>
      </Snackbar>
    </>
  );
}

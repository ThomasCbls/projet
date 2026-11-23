"use client";

import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import AddRounded from "@mui/icons-material/AddRounded";
import CasinoOutlined from "@mui/icons-material/CasinoOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import SavingsOutlined from "@mui/icons-material/SavingsOutlined";
import WalletOutlined from "@mui/icons-material/WalletOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { Barre, Tuile } from "@/components/Indicateurs";
import {
  ChampNombre,
  Chargement,
  DefilementTableau,
  EnTetePage,
  Montant,
  Section,
  celluleFigee,
} from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { type EtatCapital, type LigneMoisCapital, capital, nouvelIdMouvement } from "@/lib/capital";
import { aujourdhuiIso, bornerDate, finPeriode } from "@/lib/dates";
import { formatDateCourte, formatEuro, formatEuroSigne, formatMoisLong, formatPct, formatPctSigne } from "@/lib/format";
import { type TypeMouvement, TYPES_MOUVEMENT } from "@/lib/types";
import { GraphPatrimoine } from "./GraphPatrimoine";

const attenue = { color: "text.secondary" };
const nomType = (t: TypeMouvement) => TYPES_MOUVEMENT.find((x) => x.id === t)?.nom ?? t;
/** Signe d'un mouvement vu du capital actif. */
const signe = (t: TypeMouvement) => (t === "depot" || t === "reinjection" ? 1 : -1);

/* ------------------------------------------------------------------ */
/* Répartition des gains                                               */
/* ------------------------------------------------------------------ */

function Repartition({ etat }: { etat: EtatCapital }) {
  const lignes: { libelle: string; aide: string; valeur: React.ReactNode }[] = [
    { libelle: "Gagné", aide: "Bénéfice net de tes paris.", valeur: <Montant valeur={etat.gagne} /> },
    { libelle: "Réinvesti", aide: "Part des gains laissée en jeu.", valeur: formatEuro(etat.reinvesti) },
    { libelle: "Sécurisé", aide: "Gains mis de côté, hors jeu.", valeur: formatEuro(etat.securise) },
    { libelle: "Retiré", aide: "Argent réellement retiré.", valeur: formatEuro(etat.retire) },
    {
      libelle: "Capital actif",
      aide: `Argent encore en jeu${etat.partActif === null ? "" : ` (${formatPct(etat.partActif)} du patrimoine)`}.`,
      valeur: formatEuro(etat.capitalActif),
    },
    { libelle: "Dépôts", aide: "Argent personnel apporté.", valeur: formatEuro(etat.depots) },
  ];
  return (
    <>
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 1.25, columnGap: 2 }}>
        {lignes.map((l) => (
          <Box key={l.libelle} sx={{ display: "contents" }}>
            <Box component="dt">
              <Typography sx={{ fontWeight: 600 }}>{l.libelle}</Typography>
              <Typography variant="caption" sx={attenue}>
                {l.aide}
              </Typography>
            </Box>
            <Typography
              component="dd"
              sx={{ m: 0, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", alignSelf: "center" }}
            >
              {l.valeur}
            </Typography>
          </Box>
        ))}
      </Box>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Mouvements                                                          */
/* ------------------------------------------------------------------ */

function FormulaireMouvement({ debut, onAjouter }: { debut: string; onAjouter: (date: string, type: TypeMouvement, montant: number, note: string) => void }) {
  const fin = finPeriode(debut);
  const [date, setDate] = useState(() => bornerDate(aujourdhuiIso(), debut));
  const [type, setType] = useState<TypeMouvement>("depot");
  const [montant, setMontant] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    if (montant === null || montant <= 0) {
      setErreur("Indique un montant supérieur à 0.");
      return;
    }
    if (date < debut || date > fin) {
      setErreur("La date doit être dans la période de suivi.");
      return;
    }
    onAjouter(date, type, Math.round(montant * 100) / 100, note.trim());
    setMontant(null);
    setNote("");
    setErreur(null);
  };

  return (
    <Box component="form" onSubmit={valider} noValidate>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          alignItems: "start",
          gridTemplateColumns: { xs: "1fr 1fr", md: "10rem 12rem 8rem minmax(0, 1fr) auto" },
        }}
      >
        <TextField
          type="date"
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ htmlInput: { min: debut, max: fin }, inputLabel: { shrink: true } }}
        />
        <TextField
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as TypeMouvement)}
          helperText={TYPES_MOUVEMENT.find((t) => t.id === type)?.description}
          sx={{ gridColumn: { xs: "auto", md: "auto" } }}
        >
          {TYPES_MOUVEMENT.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.nom}
            </MenuItem>
          ))}
        </TextField>
        <ChampNombre libelle="Montant" suffixe="€" valeur={montant} onChange={setMontant} />
        <TextField label="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          type="submit"
          variant="contained"
          startIcon={<AddRounded />}
          sx={{ height: 40, gridColumn: { xs: "1 / -1", md: "auto" } }}
        >
          Ajouter
        </Button>
      </Box>
      {erreur && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {erreur}
        </Alert>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Tableau mensuel                                                     */
/* ------------------------------------------------------------------ */

function TableauMoisCapital({ mois }: { mois: LigneMoisCapital[] }) {
  return (
    <DefilementTableau libelle="Capital mois par mois">
      <Table size="small" aria-label="Capital mois par mois">
        <TableHead>
          <TableRow>
            <TableCell sx={celluleFigee}>Mois</TableCell>
            <TableCell align="right">Dépôts</TableCell>
            <TableCell align="right">Gagné</TableCell>
            <TableCell align="right">Sécurisé</TableCell>
            <TableCell align="right">Retiré</TableCell>
            <TableCell align="right">Capital actif (fin)</TableCell>
            <TableCell align="right">Patrimoine (fin)</TableCell>
            <TableCell align="right">Taux de capitalisation</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mois.map((l) => (
            <TableRow key={l.mois} hover>
              <TableCell component="th" scope="row" sx={celluleFigee}>
                {formatMoisLong(l.mois)}
              </TableCell>
              <TableCell align="right" sx={l.flux.depots ? undefined : attenue}>
                {formatEuro(l.flux.depots)}
              </TableCell>
              <TableCell align="right">
                <Montant valeur={l.flux.gagne} />
              </TableCell>
              <TableCell align="right" sx={l.flux.securise ? undefined : attenue}>
                {formatEuroSigne(l.flux.securise)}
              </TableCell>
              <TableCell align="right" sx={l.flux.retire ? undefined : attenue}>
                {formatEuro(l.flux.retire)}
              </TableCell>
              <TableCell align="right">{formatEuro(l.fin.capitalActif)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatEuro(l.fin.patrimoine)}
              </TableCell>
              <TableCell align="right">{formatPct(l.fin.tauxCapitalisation)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DefilementTableau>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PageCapital() {
  const { data, majJour } = useDonnees();
  const aujourdhui = aujourdhuiIso();
  const c = useMemo(() => (data ? capital(data, aujourdhui) : null), [data, aujourdhui]);
  if (!data || !c) return <Chargement />;
  const { etat: e } = c;

  const ajouter = (date: string, type: TypeMouvement, montant: number, note: string) =>
    majJour(date, (j) => ({ ...j, mouvements: [...j.mouvements, { id: nouvelIdMouvement(), type, montant, note }] }));
  const supprimer = (date: string, id: string) =>
    majJour(date, (j) => ({ ...j, mouvements: j.mouvements.filter((m) => m.id !== id) }));

  // Le patrimoine issu des paris progresse si patrimoine + retiré dépasse les dépôts.
  const resultat = Math.round(e.gagne * 100) / 100;

  return (
    <>
      <EnTetePage
        titre="Capital"
        sousTitre="Taux de capitalisation : ce que tu as gagné, réinvesti, sécurisé et retiré."
      />

      {c.mouvements.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Commence par enregistrer ton <strong>dépôt</strong> de départ ci-dessous. Ajoute ensuite chaque mise en sécurité
          de gains et chaque retrait : le module calcule ton capital actif et ton taux de capitalisation.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Taux de capitalisation"
            Icone={SavingsOutlined}
            hero
            valeur={formatPct(e.tauxCapitalisation)}
            detail={
              e.gagne > 0
                ? `${formatEuro(e.capitalise)} mis à l'abri sur ${formatEuro(e.gagne)} gagnés`
                : "Calculé dès que tes paris sont bénéficiaires"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Patrimoine total"
            Icone={AccountBalanceOutlined}
            valeur={formatEuro(e.patrimoine)}
            detail={
              e.depots > 0 ? `${formatPctSigne(e.progression)} par rapport à tes dépôts (retraits inclus)` : "Capital actif + sécurisé"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Capital actif"
            Icone={CasinoOutlined}
            valeur={formatEuro(e.capitalActif)}
            couleur={e.capitalActif < 0 ? "error.main" : undefined}
            detail={e.partActif === null ? "Argent encore en jeu" : `${formatPct(e.partActif)} du patrimoine en jeu`}
          >
            <Barre valeur={e.partActif === null ? null : Math.min(1, Math.max(0, e.partActif))} libelle="Part du patrimoine en jeu" />
          </Tuile>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Réellement retiré"
            Icone={WalletOutlined}
            valeur={formatEuro(e.retire)}
            detail={`Sécurisé : ${formatEuro(e.securise)}`}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Section titre="Où sont tes gains ?" sousTitre="Gagné = réinvesti + mis à l'abri (sécurisé ou retiré).">
            <Repartition etat={e} />
            {(e.depots > 0 || resultat !== 0) && (
              <Alert severity={resultat > 0 ? "success" : resultat < 0 ? "warning" : "info"} sx={{ mt: 2.5 }}>
                {resultat > 0
                  ? `Ton patrimoine issu des paris progresse réellement : ${formatEuroSigne(resultat)} par rapport à ce que tu as déposé.`
                  : resultat < 0
                    ? `Ton patrimoine issu des paris recule : ${formatEuroSigne(resultat)} par rapport à ce que tu as déposé.`
                    : "Ton patrimoine est égal à ce que tu as déposé."}
              </Alert>
            )}
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Section
            titre="Évolution du patrimoine"
            sousTitre="En fin de mois. Au-dessus des dépôts cumulés, ton patrimoine progresse."
          >
            <GraphPatrimoine mois={c.mois} />
          </Section>
        </Grid>

        <Grid size={12}>
          <Section titre="Mouvements de capital" sousTitre="Dépôts, retraits, mises en sécurité et réinjections.">
            <FormulaireMouvement debut={data.dateDebut} onAjouter={ajouter} />
            {c.mouvements.length > 0 && (
              <List disablePadding sx={{ mt: 2, mx: -1 }}>
                {c.mouvements.map((m) => (
                  <ListItem
                    key={`${m.date}-${m.id}`}
                    sx={{ borderRadius: "12px", "&:hover": { bgcolor: "action.hover" } }}
                    secondaryAction={
                      <Tooltip title="Supprimer">
                        <IconButton
                          edge="end"
                          aria-label={`Supprimer ${nomType(m.type).toLowerCase()} de ${formatEuro(m.montant)} du ${formatDateCourte(m.date)}`}
                          onClick={() => supprimer(m.date, m.id)}
                        >
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Chip label={nomType(m.type)} size="small" variant="outlined" />
                          <Box
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              color: signe(m.type) > 0 ? "success.main" : "text.primary",
                            }}
                          >
                            {signe(m.type) > 0 ? "+" : "−"}
                            {formatEuro(m.montant)}
                          </Box>
                        </Stack>
                      }
                      secondary={`${formatDateCourte(m.date)}${m.note ? ` · ${m.note}` : ""}`}
                      slotProps={{ primary: { component: "div" } }}
                      sx={{ pr: 4 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Section>
        </Grid>

        <Grid size={12}>
          <Section titre="Mois par mois" sousTitre="Mouvements et bénéfice de chaque mois, situation en fin de mois.">
            <TableauMoisCapital mois={c.mois} />
          </Section>
        </Grid>
      </Grid>
    </>
  );
}

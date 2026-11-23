"use client";

import CasinoOutlined from "@mui/icons-material/CasinoOutlined";
import PercentRounded from "@mui/icons-material/PercentRounded";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ThumbDownAltOutlined from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlined from "@mui/icons-material/ThumbUpAltOutlined";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { Barre, Tuile } from "@/components/Indicateurs";
import { Chargement, DefilementTableau, EnTetePage, Montant, Section, celluleFigee, ligneTotal } from "@/components/ui";
import { useDonnees } from "@/hooks/useDonnees";
import { aujourdhuiIso, cleMois } from "@/lib/dates";
import { formatEuro, formatEuroSigne, formatMoisLong, formatNombre, formatPct, formatPctSigne } from "@/lib/format";
import {
  type Indicateurs,
  type LigneMoisRentabilite,
  type Segment,
  MIN_PARIS_SEGMENT,
  rentabilite,
  rentabiliteParMois,
} from "@/lib/rentabilite";
import { GraphRoiParMois, GraphRoiParSport } from "./Graphiques";

const TOUT = "tout";
const attenue = { color: "text.secondary" };

/** ROI coloré selon son signe (le signe « + / − » porte aussi l'information). */
function Roi({ valeur, gras }: { valeur: number | null; gras?: boolean }) {
  const arrondi = valeur === null ? 0 : Math.round(valeur * 1000);
  return (
    <Box
      component="span"
      sx={{
        fontVariantNumeric: "tabular-nums",
        fontWeight: gras ? 700 : undefined,
        color: valeur === null ? "text.secondary" : arrondi > 0 ? "success.main" : arrondi < 0 ? "error.main" : "inherit",
      }}
    >
      {formatPctSigne(valeur)}
    </Box>
  );
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* ------------------------------------------------------------------ */
/* Calcul du ROI, présenté comme dans l'exemple                        */
/* ------------------------------------------------------------------ */

function CalculRoi({ ind, enCours }: { ind: Indicateurs; enCours: number }) {
  const lignes: [string, React.ReactNode][] = [
    ["Total des mises", formatEuro(ind.mises)],
    ["Gains encaissés", formatEuro(ind.gainsEncaisses)],
    ["Bénéfice net", <Montant key="b" valeur={ind.benefice} />],
    ["ROI", <Roi key="r" valeur={ind.roi} gras />],
  ];
  const parEuro = ind.roi === null ? null : Math.round(ind.roi * 100) / 100;
  return (
    <>
      <Typography
        sx={{
          mb: 2,
          px: 1.5,
          py: 1,
          borderRadius: "12px",
          bgcolor: "bt.surfaceRaised",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        ROI = (Bénéfice net ÷ Total des mises) × 100
      </Typography>
      <Table size="small" aria-label="Calcul du ROI">
        <TableBody>
          {lignes.map(([libelle, valeur], i) => (
            <TableRow key={libelle} sx={i === lignes.length - 1 ? ligneTotal : undefined}>
              <TableCell component="th" scope="row">
                {libelle}
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {valeur}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
        {parEuro === null
          ? "Aucun pari tranché sur la période : le ROI n'est pas encore calculable."
          : parEuro >= 0
            ? `Pour chaque euro misé, tu as généré ${formatEuro(parEuro)} de bénéfice.`
            : `Pour chaque euro misé, tu as perdu ${formatEuro(-parEuro)}.`}
        {enCours > 0 && ` ${formatEuro(enCours)} misés sur des paris sans résultat ne sont pas encore comptés.`}
      </Typography>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Simples / combinés                                                  */
/* ------------------------------------------------------------------ */

function ColonneType({ titre, ind }: { titre: string; ind: Indicateurs }) {
  const lignes: [string, React.ReactNode][] = [
    ["ROI", <Roi key="r" valeur={ind.roi} gras />],
    ["Bénéfice / perte", <Montant key="b" valeur={ind.benefice} />],
    ["Total misé", formatEuro(ind.mises)],
    ["Cote moyenne", formatNombre(ind.coteMoyenne)],
    ["Taux de réussite", formatPct(ind.reussite)],
  ];
  return (
    <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "bt.surfaceRaised", height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {titre}
        </Typography>
        <Typography variant="caption" sx={attenue}>
          {pluriel(ind.nbParis, "pari")}
        </Typography>
      </Stack>
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0.75, columnGap: 2 }}>
        {lignes.map(([libelle, valeur]) => (
          <Box key={libelle} sx={{ display: "contents" }}>
            <Typography component="dt" variant="body2" sx={attenue}>
              {libelle}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {valeur}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Points forts / faibles                                              */
/* ------------------------------------------------------------------ */

function Constat({ segment, fort, roiGlobal }: { segment: Segment; fort: boolean; roiGlobal: number | null }) {
  const { ind } = segment;
  return (
    <Stack direction="row" sx={{ gap: 1.5, alignItems: "flex-start" }}>
      <Avatar
        variant="rounded"
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          bgcolor: "bt.surfaceRaised",
          color: fort ? "success.main" : "error.main",
        }}
      >
        {fort ? <ThumbUpAltOutlined fontSize="small" /> : <ThumbDownAltOutlined fontSize="small" />}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={attenue}>
          {fort ? "Point fort" : "Point faible"}
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{segment.libelle}</Typography>
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          ROI <Roi valeur={ind.roi} gras /> · <Montant valeur={ind.benefice} /> sur {pluriel(ind.nbParis, "pari")} · réussite{" "}
          {formatPct(ind.reussite)}
        </Typography>
        {!fort && segment.roiSans !== null && (
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
            Sans eux, ton ROI global passerait de {formatPctSigne(roiGlobal)} à{" "}
            <Box component="strong" sx={{ color: "text.primary" }}>
              {formatPctSigne(segment.roiSans)}
            </Box>
            .
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Tableaux                                                            */
/* ------------------------------------------------------------------ */

function TableauSportsRoi({ lignes }: { lignes: ReturnType<typeof rentabilite>["parSport"] }) {
  return (
    <DefilementTableau libelle="ROI par sport">
      <Table size="small" aria-label="ROI par sport">
        <TableHead>
          <TableRow>
            <TableCell sx={celluleFigee}>Sport</TableCell>
            <TableCell align="right">Paris</TableCell>
            <TableCell align="right">Misé</TableCell>
            <TableCell align="right">Bénéfice / perte</TableCell>
            <TableCell align="right">ROI</TableCell>
            <TableCell align="right">ROI simples</TableCell>
            <TableCell align="right">ROI combinés</TableCell>
            <TableCell align="right">Cote moy.</TableCell>
            <TableCell align="right">Réussite</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.id} hover>
              <TableCell component="th" scope="row" sx={celluleFigee}>
                {l.nom}
              </TableCell>
              <TableCell align="right">{l.total.nbParis}</TableCell>
              <TableCell align="right">{formatEuro(l.total.mises)}</TableCell>
              <TableCell align="right">
                <Montant valeur={l.total.benefice} />
              </TableCell>
              <TableCell align="right">
                <Roi valeur={l.total.roi} gras />
              </TableCell>
              <TableCell align="right">
                <Roi valeur={l.simples.roi} />
              </TableCell>
              <TableCell align="right">
                <Roi valeur={l.combines.roi} />
              </TableCell>
              <TableCell align="right">{formatNombre(l.total.coteMoyenne)}</TableCell>
              <TableCell align="right">{formatPct(l.total.reussite)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DefilementTableau>
  );
}

function TableauMoisRoi({
  lignes,
  selection,
  onChoisir,
}: {
  lignes: LigneMoisRentabilite[];
  selection: string;
  onChoisir: (mois: string) => void;
}) {
  return (
    <DefilementTableau libelle="Rentabilité par mois">
      <Table size="small" aria-label="Rentabilité par mois">
        <TableHead>
          <TableRow>
            <TableCell sx={celluleFigee}>Mois</TableCell>
            <TableCell align="right">ROI global</TableCell>
            <TableCell align="right">ROI simples</TableCell>
            <TableCell align="right">ROI combinés</TableCell>
            <TableCell align="right">Misé</TableCell>
            <TableCell align="right">Bénéfice / perte</TableCell>
            <TableCell align="right">Cote moy.</TableCell>
            <TableCell align="right">Réussite</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((l) => (
            <TableRow
              key={l.mois}
              hover
              selected={l.mois === selection}
              tabIndex={0}
              aria-selected={l.mois === selection}
              onClick={() => onChoisir(l.mois)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChoisir(l.mois);
                }
              }}
              sx={{ cursor: "pointer" }}
            >
              <TableCell component="th" scope="row" sx={celluleFigee}>
                {formatMoisLong(l.mois)}
              </TableCell>
              <TableCell align="right">
                <Roi valeur={l.global.roi} gras />
              </TableCell>
              <TableCell align="right">
                <Roi valeur={l.simples.roi} />
              </TableCell>
              <TableCell align="right">
                <Roi valeur={l.combines.roi} />
              </TableCell>
              <TableCell align="right" sx={l.global.mises ? undefined : attenue}>
                {formatEuro(l.global.mises)}
              </TableCell>
              <TableCell align="right">
                <Montant valeur={l.global.benefice} />
              </TableCell>
              <TableCell align="right">{formatNombre(l.global.coteMoyenne)}</TableCell>
              <TableCell align="right">{formatPct(l.global.reussite)}</TableCell>
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

export function PageRentabilite() {
  const { data } = useDonnees();
  const aujourdhui = aujourdhuiIso();
  const parMois = useMemo(() => (data ? rentabiliteParMois(data, aujourdhui) : null), [data, aujourdhui]);
  const [choix, setChoix] = useState<string | null>(null);

  // Par défaut : le mois en cours s'il fait partie de la période, sinon toute la période.
  const moisCourant = cleMois(aujourdhui);
  const parDefaut = parMois?.some((l) => l.mois === moisCourant) ? moisCourant : TOUT;
  const selection = choix !== null && (choix === TOUT || parMois?.some((l) => l.mois === choix)) ? choix : parDefaut;

  const r = useMemo(() => (data ? rentabilite(data, selection === TOUT ? null : selection) : null), [data, selection]);
  if (!data || !parMois || !r) return <Chargement />;

  const { global: g } = r;
  const libellePeriode = selection === TOUT ? "sur toute la période" : `en ${formatMoisLong(selection).toLowerCase()}`;
  const sansSport = r.parSport.find((l) => l.id === "nc")?.total.nbParis ?? 0;

  return (
    <>
      <EnTetePage
        titre="Rentabilité"
        sousTitre="ROI global, par type de pari et par sport, mois par mois."
        action={
          <TextField
            select
            label="Période"
            value={selection}
            onChange={(e) => setChoix(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={TOUT}>Toute la période</MenuItem>
            {parMois.map((l) => (
              <MenuItem key={l.mois} value={l.mois}>
                {formatMoisLong(l.mois)}
              </MenuItem>
            ))}
          </TextField>
        }
      />

      {g.nbParis === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Aucun pari tranché {libellePeriode}. Les indicateurs se calculent dès qu&apos;un pari a un résultat (G ou P).
        </Alert>
      )}
      {sansSport > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {pluriel(sansSport, "pari")} {sansSport > 1 ? "n'ont" : "n'a"} pas de sport {libellePeriode}. Renseigne-le dans{" "}
          <strong>Saisie du jour</strong> pour affiner le ROI par sport.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="ROI global"
            Icone={PercentRounded}
            hero
            valeur={formatPctSigne(g.roi)}
            detail={`${formatEuroSigne(g.benefice)} pour ${formatEuro(g.mises)} misés`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Bénéfices et pertes"
            Icone={TrendingUpRounded}
            valeur={<Montant valeur={g.benefice} />}
            detail={
              <>
                <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>
                  {formatEuroSigne(g.beneficesBruts)}
                </Box>{" "}
                gagnés ·{" "}
                <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                  {formatEuroSigne(g.pertes)}
                </Box>{" "}
                perdus
              </>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Cote moyenne"
            Icone={CasinoOutlined}
            valeur={formatNombre(g.coteMoyenne)}
            detail={`Sur ${pluriel(g.nbParis, "pari")} tranché${g.nbParis > 1 ? "s" : ""}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Tuile
            libelle="Taux de réussite"
            Icone={ReceiptLongOutlined}
            valeur={formatPct(g.reussite)}
            detail={`${g.gagnes} gagnés · ${g.perdus} perdus`}
          >
            <Barre valeur={g.reussite} libelle="Part des paris gagnés" />
          </Tuile>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Section titre="Calcul du ROI" sousTitre={`Paris tranchés ${libellePeriode}.`}>
            <CalculRoi ind={g} enCours={r.enCours} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Section titre="Simples et combinés" sousTitre="Un combiné compte pour un seul pari, à sa cote combinée.">
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ColonneType titre="Paris simples" ind={r.simples} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <ColonneType titre="Combinés" ind={r.combines} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                Ce qui fait ta rentabilité
              </Typography>
              {r.pointFort || r.pointFaible ? (
                <Stack spacing={2}>
                  {r.pointFort && <Constat segment={r.pointFort} fort roiGlobal={g.roi} />}
                  {r.pointFaible && <Constat segment={r.pointFaible} fort={false} roiGlobal={g.roi} />}
                </Stack>
              ) : (
                <Typography variant="body2" sx={attenue}>
                  Pas encore assez de paris pour dégager une tendance (au moins {MIN_PARIS_SEGMENT} paris tranchés d&apos;un
                  même sport et d&apos;un même type).
                </Typography>
              )}
            </Box>
          </Section>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Section titre="ROI par sport" sousTitre={`Paris tranchés ${libellePeriode}.`}>
            <GraphRoiParSport lignes={r.parSport} />
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Section titre="Détail par sport" sousTitre="Un combiné est rattaché à son sport s'il est commun à toutes ses sélections.">
            {r.parSport.length === 0 ? (
              <Typography variant="body2" sx={{ ...attenue, py: 4, textAlign: "center" }}>
                Aucun pari tranché {libellePeriode}.
              </Typography>
            ) : (
              <TableauSportsRoi lignes={r.parSport} />
            )}
          </Section>
        </Grid>

        <Grid size={12}>
          <Section titre="Mois par mois" sousTitre="Toucher un mois pour afficher son détail.">
            <GraphRoiParMois lignes={parMois} />
            <Box sx={{ mt: 2 }}>
              <TableauMoisRoi
                lignes={parMois}
                selection={selection}
                onChoisir={(m) => {
                  setChoix(m);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </Box>
          </Section>
        </Grid>
      </Grid>
    </>
  );
}

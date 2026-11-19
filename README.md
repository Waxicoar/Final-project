# Your Climate, Your Future — Initial Prototype

**DSC 106**  
**Team:** 

## What currently works

1. Choose one of six cities. The interactive orthographic globe rotates to each choice and updates the selected city's information. City-level projections are **not yet connected**.
2. Highlight one of three SSP pathways, or reset to show all. Click any line/point, drag the decade inspector, or use the decade slider. The chart updates global warming summaries and explanatory text.
3. Move the hypothetical warming slider to explore the **method** of identifying a warm season from a fixed historical 75th-percentile threshold. This chart is explicitly labeled **schematic, not actual CMIP6 climate data**.
4. Read two required prototype write-up sections: what was done so far (four sentences) and what will be challenging (four sentences).

## Dataset, provenance, and important limitations

`data/canesm5_global_decades.csv` contains **published CMIP6 global average projections**, not city-specific temperature data. It uses CanESM5, ensemble member `r1i1p1f1`, near-surface air temperature (`tas`), eight future decade summaries (2021–2100), three scenarios (SSP1-2.6, SSP2-4.5, SSP5-8.5), and an **1850–1900 baseline**. The underlying data come from the public [`mathause/cmip_temperatures`](https://github.com/mathause/cmip_temperatures) compilation, specifically `temperatures/cmip6/csv/cmip6_temperatures_one_ens_1850_1900.csv` filtered to those conditions.


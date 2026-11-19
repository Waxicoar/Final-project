/* Your Climate, Your Future — DSC 106 initial prototype (2026)
 * Actual CMIP6 global decade summaries: data/canesm5_global_decades.csv
 * Season curve is explicitly pedagogical and synthetic; NEVER present as CMIP6 output.
 */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const cityList = [
    {name:'San Diego', country:'California · United States', lat:32.7157, lon:-117.1611},
    {name:'New York', country:'New York · United States', lat:40.7128, lon:-74.0060},
    {name:'London', country:'England · United Kingdom', lat:51.5072, lon:-0.1276},
    {name:'Mumbai', country:'Maharashtra · India', lat:19.0760, lon:72.8777},
    {name:'Tokyo', country:'Japan', lat:35.6762, lon:139.6503},
    {name:'Sydney', country:'New South Wales · Australia', lat:-33.8688, lon:151.2093}
  ];
  const colors = {'SSP1-2.6':'#5397bd','SSP2-4.5':'#e9a065','SSP5-8.5':'#59ac8b'};
  const names = Object.keys(colors);
  const explanations = {
    'SSP1-2.6': {title:'Lower-emissions pathway',copy:'A future with relatively strong efforts to limit greenhouse gas emissions, associated with lower radiative forcing by 2100.',context:'Explore whether global warming begins to level off later in the century.'},
    'SSP2-4.5': {title:'Intermediate pathway',copy:'A middle-of-the-road pathway with intermediate societal development and greenhouse gas emissions.',context:'Explore continued warming at an intermediate rate.'},
    'SSP5-8.5': {title:'Very high-emissions pathway',copy:'A fossil-fueled development pathway with very high greenhouse gas emissions.',context:'Compare its rising temperatures with lower-emissions pathways toward 2100.'}
  };
  const state = {city:cityList[0], scenario:null, index:3, globalData:[], periods:[], mockIncrease:2};
  const displayTemperature = x => `${Number(x).toFixed(2)}°C`;
  const decodePeriod = s => s.replace(/\u2013/g,'–').replace(/-/g,'–');
  const fixedCSV = 'data/canesm5_global_decades.csv';

  function initCities(){
    const pills = d3.select('#city-pills');
    pills.selectAll('button').data(cityList).join('button').attr('type','button')
      .attr('aria-pressed', d => String(d.name === state.city.name))
      .classed('active', d => d.name === state.city.name)
      .text(d => d.name)
      .on('click',(event,d)=>selectCity(d));
    selectCity(state.city);
  }
  function selectCity(city){
    state.city = city;
    $('#city-name').textContent = city.name;
    $('#city-country').textContent = city.country;
    $('#city-question').textContent = `How long is summer in ${city.name}?`;
    d3.select('#city-pills').selectAll('button')
      .classed('active',d=>d.name===city.name)
      .attr('aria-pressed',d=>String(d.name===city.name));
    renderGlobe();
  }
  function renderGlobe(){
    const svg=d3.select('#globe');
    svg.selectAll('*').remove();
    const projection=d3.geoOrthographic().center([0,0]).translate([300,207]).scale(169)
      .rotate([-state.city.lon,-state.city.lat]).clipAngle(90);
    const path=d3.geoPath(projection);
    const defs=svg.append('defs');
    const gradient=defs.append('radialGradient').attr('id','globe-grad').attr('cx','35%').attr('cy','28%');
    gradient.append('stop').attr('offset','0%').attr('stop-color','#d7ebdc');
    gradient.append('stop').attr('offset','100%').attr('stop-color','#c2ded1');
    svg.append('circle').attr('cx',300).attr('cy',207).attr('r',189).attr('fill','none').attr('stroke','#ccded5').attr('stroke-width',1);
    svg.append('circle').attr('cx',300).attr('cy',207).attr('r',206).attr('fill','none').attr('stroke','#dbe7dc').attr('stroke-dasharray','4,7');
    svg.append('path').datum({type:'Sphere'}).attr('d',path).attr('fill','url(#globe-grad)').attr('stroke','#7fae9b').attr('stroke-width',1.3);
    svg.append('path').datum(d3.geoGraticule10()).attr('d',path).attr('fill','none').attr('stroke','#91baa9').attr('stroke-width',.65).attr('opacity',.78);
    svg.append('path').datum({type:'LineString',coordinates:[[state.city.lon,-89],[state.city.lon,89]]}).attr('d',path).attr('fill','none').attr('stroke','#b3cfc1').attr('stroke-dasharray','3,6');
    const visible=cityList.filter(c=>d3.geoDistance([c.lon,c.lat],[state.city.lon,state.city.lat]) < (Math.PI / 2 - .025));
    const markers=svg.selectAll('g.city-marker').data(visible,d=>d.name).join('g')
      .attr('class','city-marker').attr('tabindex',0).attr('role','button')
      .attr('aria-label',d=>`Select ${d.name}`).attr('transform',d=>`translate(${projection([d.lon,d.lat])})`)
      .on('click',(event,d)=>selectCity(d))
      .on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectCity(d);}});
    markers.filter(d=>d.name===state.city.name).append('circle').attr('r',18).attr('fill','none').attr('stroke','#f2a970').attr('stroke-width',1.5).attr('opacity',.85);
    markers.append('circle').attr('r',d=>d.name===state.city.name?7:5).attr('fill',d=>d.name===state.city.name?'#ea9866':'#256c66').attr('stroke','#eaf3e8').attr('stroke-width',2);
    markers.append('text').attr('y',-17).attr('text-anchor','middle').attr('fill','#24564e').text(d=>d.name);
    svg.append('text').attr('x',36).attr('y',376).attr('font-size',10).attr('letter-spacing','.13em').attr('font-weight',800).attr('fill','#78a499').text('EXPLORE THE GLOBE');
    svg.append('text').attr('x',564).attr('y',376).attr('font-size',10).attr('text-anchor','end').attr('fill','#78a499').text(`${Math.abs(state.city.lat).toFixed(1)}°${state.city.lat>=0?'N':'S'} / ${Math.abs(state.city.lon).toFixed(1)}°${state.city.lon>=0?'E':'W'}`);
  }

  function renderScenarioControls(){
    const container=d3.select('#scenario-pills');
    const items=[null,...names];
    container.selectAll('button').data(items,d=>d||'all').join('button')
      .attr('type','button').attr('aria-pressed',d=>String(d===state.scenario))
      .classed('active',d=>d===state.scenario)
      .html(d=>d?`<span class="scenario-dot" style="background:${colors[d]}"></span>${d}`:'All pathways')
      .on('click',(event,d)=>{state.scenario=(state.scenario===d&&d!==null)?null:d;updateScenario();});
  }
  function updateScenario(){
    renderScenarioControls();
    if(!state.globalData.length)return;
    const period=state.periods[state.index];
    const entries=state.globalData.filter(d=>d.period===period);
    const min=d3.min(entries,d=>d.value),max=d3.max(entries,d=>d.value);
    const focus=entries.find(d=>d.scenario===state.scenario);
    $('#active-scenario-label').textContent=state.scenario || 'ALL SCENARIOS';
    $('#stat-label').textContent=focus?'Projected global warming':'Range across future pathways';
    $('#stat-value').textContent=focus?displayTemperature(focus.value):`${min.toFixed(2)}–${max.toFixed(2)}°C`;
    $('#stat-note').textContent=focus?`${period} decade · 1850–1900 global baseline`:`${period} decade · ${displayTemperature(max-min)} difference between highest and lowest projections`;
    const chosen=state.scenario?explanations[state.scenario]:null;
    $('#scenario-description').textContent=chosen?chosen.copy:'Shared Socioeconomic Pathways describe alternative futures with different societal and emissions assumptions. They are conditional projections—not promises about what will happen.';
    $('#scenario-context').textContent=chosen?chosen.context:'Select any scenario line to focus on its assumptions and projection.';
    $('#decade-value').textContent=period;
    $('#decade-slider').value=String(state.index);
    renderScenarioChart();
  }
  function renderScenarioChart(){
    if(!state.globalData.length)return;
    const el=$('#scenario-chart');
    const width=Math.max(480,Math.round(el.getBoundingClientRect().width||600));
    const height=320;
    const margin={top:30,right:24,bottom:43,left:51};
    const svg=d3.select(el).attr('viewBox',`0 0 ${width} ${height}`);
    svg.selectAll('*').remove();
    const x=d3.scaleLinear().domain([2020,2100]).range([margin.left,width-margin.right]);
    const y=d3.scaleLinear().domain([0,8]).range([height-margin.bottom,margin.top]);
    svg.append('g').attr('class','chart-grid').selectAll('line').data([0,2,4,6,8]).join('line')
      .attr('x1',margin.left).attr('x2',width-margin.right).attr('y1',d=>y(d)).attr('y2',d=>y(d));
    svg.append('g').attr('class','chart-axis').attr('transform',`translate(0,${height-margin.bottom})`)
      .call(d3.axisBottom(x).tickValues([2030,2040,2050,2060,2070,2080,2090,2100]).tickFormat(d3.format('d')).tickSizeOuter(0))
      .call(g=>g.select('.domain').remove());
    svg.append('g').attr('class','chart-axis').attr('transform',`translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d=>`+${d}°`).tickSizeOuter(0))
      .call(g=>g.select('.domain').remove());
    const selectedPeriod=state.periods[state.index];
    const selectedRows=state.globalData.filter(d=>d.period===selectedPeriod);
    const xFocus=x(selectedRows[0].year);
    svg.append('rect').attr('x',xFocus-17).attr('y',margin.top).attr('width',34).attr('height',height-margin.top-margin.bottom)
      .attr('fill','#e3efe5').attr('opacity',.7);
    svg.append('line').attr('x1',xFocus).attr('x2',xFocus).attr('y1',margin.top).attr('y2',height-margin.bottom)
      .attr('stroke','#8caea7').attr('stroke-dasharray','4,5');
    const drawLine=d3.line().x(d=>x(d.year)).y(d=>y(d.value)).curve(d3.curveMonotoneX);
    for(const name of names){
      const data=state.globalData.filter(d=>d.scenario===name);
      const dim=state.scenario && state.scenario!==name;
      svg.append('path').datum(data).attr('fill','none').attr('stroke',colors[name]).attr('stroke-width',dim?2:3.3)
        .attr('stroke-linecap','round').attr('stroke-linejoin','round').attr('opacity',dim?.17:1)
        .attr('d',drawLine).attr('class','scenario-line').on('click',()=>{state.scenario=state.scenario===name?null:name;updateScenario();});
      svg.append('path').datum(data).attr('class','line-hitarea').attr('d',drawLine).on('click',()=>{state.scenario=state.scenario===name?null:name;updateScenario();});
      svg.selectAll(`circle.point-${name.replace(/[^a-z0-9]/gi,'')}`).data(data).join('circle')
        .attr('cx',d=>x(d.year)).attr('cy',d=>y(d.value)).attr('r',d=>d.period===selectedPeriod?5.2:2.7)
        .attr('fill',colors[name]).attr('stroke','#fff').attr('stroke-width',d=>d.period===selectedPeriod?2:0)
        .attr('opacity',dim?.18:1).attr('pointer-events','all')
        .on('mouseenter',(event,d)=>showScenarioTooltip(event,d))
        .on('mousemove',(event,d)=>showScenarioTooltip(event,d))
        .on('mouseleave',()=>$('#scenario-tooltip').hidden=true)
        .on('click',(event,d)=>{event.stopPropagation();state.index=state.periods.indexOf(d.period);state.scenario=name;updateScenario();});
      const fp=selectedRows.find(d=>d.scenario===name);
      svg.append('circle').attr('cx',x(fp.year)).attr('cy',y(fp.value)).attr('r',dim?3.8:7.7)
        .attr('fill',colors[name]).attr('stroke','#fff').attr('stroke-width',2.3).attr('opacity',dim?.3:1).attr('pointer-events','none');
    }
    const selection=svg.append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',width-margin.left-margin.right)
      .attr('height',height-margin.top-margin.bottom).attr('fill','transparent').attr('pointer-events','all');
    // Draggable decade inspector; highlighted scenario lines remain clickable using hit areas above.
    selection.lower();
    const decadeFromPointer=(event)=>{
      const [mx]=d3.pointer(event,svg.node());
      const nearest=state.periods.map((period,i)=>({i,dist:Math.abs(x(state.globalData.find(d=>d.period===period).year)-mx)}))
        .sort((a,b)=>a.dist-b.dist)[0];
      if(nearest&&nearest.i!==state.index){state.index=nearest.i;updateScenario();}
    };
    svg.on('click.inspect',(event)=>{
      if(event.target.closest?.('.line-hitarea,.scenario-line'))return;
      decadeFromPointer(event);
    });
    svg.on('pointermove.inspect',(event)=>{
      if(event.buttons===1)decadeFromPointer(event);
    });
  }
  function showScenarioTooltip(event,d){
    const tooltip=$('#scenario-tooltip');
    const parent=$('.line-graph').getBoundingClientRect();
    tooltip.hidden=false;
    tooltip.innerHTML=`<small>${d.period}</small><div><strong>${d.scenario}</strong> &nbsp;${displayTemperature(d.value)}</div>`;
    tooltip.style.left=`${Math.min(event.clientX-parent.left+13,parent.width-145)}px`;
    tooltip.style.top=`${Math.max(4,event.clientY-parent.top-62)}px`;
  }
  async function initScenarios(){
    $('#reset-scenarios').addEventListener('click',()=>{state.scenario=null;updateScenario();});
    $('#decade-slider').addEventListener('input',event=>{state.index=Number(event.target.value);updateScenario();});
    renderScenarioControls();
    try{
      const data=await d3.csv(fixedCSV,d=>({
        model:d.model,member:d.member,scenario:d.scenario,
        period:decodePeriod(d.period),year:(+d.period.slice(0,4)+Number(d.period.slice(-4)))/2,
        value:Number(d.anomaly_c),baseline:d.baseline
      }));
      if(data.length!==24||data.some(d=>!Number.isFinite(d.value)||!names.includes(d.scenario))){throw new Error('The CSV did not contain the expected 24 CanESM5 records.');}
      state.globalData=data;
      state.periods=[...new Set(data.map(d=>d.period))].sort((a,b)=>Number(a.slice(0,4))-Number(b.slice(0,4)));
      updateScenario();
    }catch(err){
      $('#chart-error').hidden=false;
      $('#chart-error').textContent=`Could not load the CMIP6 CSV (${err.message}). Use a local web server or GitHub Pages and keep data/canesm5_global_decades.csv in place.`;
      $('#stat-note').textContent='Data currently unavailable. Check the file path.';
    }
  }

  // Synthetic, explicitly illustrative seasonal curve; NOT a city or a climate-model output.
  const days=d3.range(1,366);
  const referenceTemp=(d)=>18+11*Math.cos((d-205)*Math.PI*2/365)+.15*Math.cos(d*.12);
  const reference30Years=d3.range(30).flatMap(yr=>days.map(d=>referenceTemp(d)+.30*Math.sin(yr*1.31+d*.015)));
  const threshold=d3.quantile(reference30Years,.75);
  const baselineTemps=days.map(d=>({day:d,temp:referenceTemp(d)}));
  function warmSeason(offset){
    const included=days.filter(d=>referenceTemp(d)+offset>threshold);
    return {start:included[0],end:included[included.length-1],length:included.length ? included[included.length-1]-included[0]+1 : 0};
  }
  function dayLabel(d){const date=new Date(Date.UTC(2025,0,d));return date.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});}
  function updateSeasons(){
    const offset=state.mockIncrease;
    const baseline=warmSeason(0), warmer=warmSeason(offset);
    $('#warming-value').textContent=`+${offset.toFixed(1)}°C`;
    $('#summer-length').innerHTML=`${warmer.length} <small>days</small>`;
    $('#summer-delta').textContent=`${warmer.length-baseline.length>=0?'+':''}${warmer.length-baseline.length} days compared with illustrated baseline`;
    $('#summer-start').textContent=dayLabel(warmer.start);
    $('#summer-end').textContent=dayLabel(warmer.end);
    $('#summer-baseline').textContent=`${baseline.length} days`;
    renderSeasonChart();
  }
  function renderSeasonChart(){
    const el=$('#season-chart');
    const width=Math.max(500,Math.round(el.getBoundingClientRect().width||665)),height=320;
    const margin={top:24,right:19,bottom:45,left:46};
    const svg=d3.select(el).attr('viewBox',`0 0 ${width} ${height}`);
    svg.selectAll('*').remove();
    const x=d3.scaleLinear().domain([1,365]).range([margin.left,width-margin.right]);
    const y=d3.scaleLinear().domain([0,38]).range([height-margin.bottom,margin.top]);
    const current=warmSeason(state.mockIncrease);
    svg.append('rect').attr('class','method-shade').attr('x',x(current.start)).attr('width',x(current.end)-x(current.start))
      .attr('y',margin.top).attr('height',height-margin.top-margin.bottom);
    svg.append('g').attr('class','chart-grid').selectAll('line').data([0,10,20,30]).join('line')
      .attr('x1',margin.left).attr('x2',width-margin.right).attr('y1',d=>y(d)).attr('y2',d=>y(d));
    svg.append('g').attr('class','chart-axis').attr('transform',`translate(0,${height-margin.bottom})`)
      .call(d3.axisBottom(x).tickValues([1,61,121,182,244,305,365]).tickFormat(d=>new Date(Date.UTC(2025,0,d)).toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})))
      .call(g=>g.select('.domain').remove());
    svg.append('g').attr('class','chart-axis').attr('transform',`translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickValues([0,10,20,30]).tickFormat(d=>d+'°')).call(g=>g.select('.domain').remove());
    svg.append('line').attr('x1',margin.left).attr('x2',width-margin.right).attr('y1',y(threshold)).attr('y2',y(threshold))
      .attr('stroke','#b9796b').attr('stroke-width',1.6).attr('stroke-dasharray','6,5');
    svg.append('text').attr('x',width-margin.right-4).attr('y',y(threshold)-10)
      .attr('text-anchor','end').attr('fill','#a9695e').attr('font-size',10).attr('font-weight',800)
      .text(`HISTORICAL 75TH PERCENTILE · ${threshold.toFixed(1)}°C*`);
    const baselineLine=d3.line().x(d=>x(d.day)).y(d=>y(d.temp)).curve(d3.curveMonotoneX);
    svg.append('path').datum(baselineTemps).attr('d',baselineLine).attr('fill','none').attr('stroke','#6c9da9').attr('stroke-width',2.1);
    svg.append('path').datum(baselineTemps.map(d=>({day:d.day,temp:d.temp+state.mockIncrease}))).attr('d',baselineLine)
      .attr('fill','none').attr('stroke','#e09565').attr('stroke-width',3);
    for(const date of [current.start,current.end]){
      svg.append('line').attr('class','method-marker').attr('x1',x(date)).attr('x2',x(date)).attr('y1',margin.top+7).attr('y2',height-margin.bottom);
      svg.append('circle').attr('cx',x(date)).attr('cy',y(referenceTemp(date)+state.mockIncrease)).attr('r',4.8).attr('fill','#e09565').attr('stroke','#fff').attr('stroke-width',2);
    }
    svg.append('text').attr('x',margin.left).attr('y',12).attr('font-size',9).attr('fill','#8a9e94').attr('letter-spacing','.09em').text('ILLUSTRATIVE TEMPERATURE (°C)');
  }
  function initSeasons(){
    $('#warming-input').addEventListener('input',event=>{state.mockIncrease=Number(event.target.value);updateSeasons();});
    updateSeasons();
  }
  function init(){
    if(typeof d3==='undefined'){
      const err=$('#chart-error');err.hidden=false;
      err.textContent='D3.js could not be loaded. Check your internet connection and refresh the page.';
      return;
    }
    initCities();initScenarios();initSeasons();
    let handle;
    window.addEventListener('resize',()=>{clearTimeout(handle);handle=setTimeout(()=>{renderGlobe();renderScenarioChart();renderSeasonChart();},160);});
  }
  document.addEventListener('DOMContentLoaded',init);
})();

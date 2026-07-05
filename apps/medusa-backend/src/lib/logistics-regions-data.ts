export type WarehouseRegionSeed = {
  id: string
  code: string
  name_en: string
  name_zh: string
  country_code: string
  s2bdiy_count: number | null
  enabled: boolean
  notes: string
  sort_order: number
  raw_json: Record<string, unknown>
}

export type ShipToRegionSeed = {
  id: string
  zone: string
  country_region_en: string
  country_region_zh: string
  country_code: string
  phone_code: string
  abbreviation: string
  enabled: boolean
  blocked: boolean
  blocked_reason: string
  sort_order: number
  raw_json: Record<string, unknown>
}

const parseNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const WAREHOUSE_ROWS = `
wr_china	china	China	国内发货	CN	1513	true		1	8	China (1513)	国内发货(1513)
wr_united_states	united_states	United States	美国本土	US	544	true		2	9	United States (544)	美国本土(544)
wr_japan	japan	Japan	日本本土	JP	26	true		3	10	Japan (26)	日本本土(26)
wr_russia	russia	Russia	俄罗斯本土	RU	1	false	取消俄罗斯发货地区，	4	11	Russia (1)	俄罗斯本土(1)
wr_mexico	mexico	Mexico	墨西哥本土	MX	24	true		5	12	Mexico (24)	墨西哥本土(24)
wr_australia	australia	Australia	澳大利亚本土	AU	23	true		6	13	Australia (23)	澳大利亚本土(23)
wr_italy	italy	Italy	意大利本土	IT	9	true		7	14	Italy (9)	意大利本土(9)
wr_canada	canada	Canada	加拿大本土	CA	82	true		8	15	Canada (82)	加拿大本土(82)
wr_south_korea	south_korea	South Korea	韩国本土	KR	5	true		9	16	South Korea (5)	韩国本土(5)
wr_brazil	brazil	Brazil	巴西本土	BR	3	true		10	17	Brazil (3)	巴西本土(3)
wr_saudi_arabia	saudi_arabia	Saudi Arabia	沙特本土	SA	4	true		11	18	Saudi Arabia (4)	沙特本土(4)
wr_united_kingdom	united_kingdom	United Kingdom	英国本土	GB	9	true		12	19	United Kingdom (9)	英国本土(9)
wr_france	france	France	法国本土	FR	24	true		13	20	France (24)	法国本土(24)
wr_germany	germany	Germany	德国本土	DE	39	true		14	21	Germany (39)	德国本土(39)
wr_spain	spain	Spain	西班牙本土	ES	9	true		15	22	Spain (9)	西班牙本土(9)
wr_philippines	philippines	Philippines	菲律宾本土	PH	12	true		16	23	Philippines (12)	菲律宾本土(12)
wr_indonesia	indonesia	Indonesia	印尼本土	ID	6	true		17	24	Indonesia (6)	印尼本土(6)
wr_thailand	thailand	Thailand	泰国本土	TH	6	true		18	25	Thailand (6)	泰国本土(6)
wr_poland	poland	Poland	波兰本土	PL	15	true		19	26	Poland (15)	波兰本土(15)
wr_malaysia	malaysia	Malaysia	马来西亚本土	MY	6	true		20	27	Malaysia (6)	马来西亚本土(6)
`.trim()

const SHIP_TO_ROWS = `
str_af	Asia	Afghanistan	阿富汗	af	+93	AF	1	6	Afghanistan – +93
str_ax	Europe	Åland Islands	奥兰群岛	ax	+358	AX	2	7	Åland Islands – +358
str_al	Europe	Albania	阿尔巴尼亚	al	+355	AL	3	8	Albania – +355
str_dz	Africa	Algeria	阿尔及利亚	dz	+213	DZ	4	9	Algeria – +213
str_as	Oceania	American Samoa	美属萨摩亚	as	+1-684	AS	5	10	American Samoa – +1-684
str_ad	Europe	Andorra	安道尔	ad	+376	AD	6	11	Andorra – +376
str_ao	Africa	Angola	安哥拉	ao	+244	AO	7	12	Angola – +244
str_ai	Central, South America	Anguilla	安圭拉	ai	+1-264	AI	8	13	Anguilla – +1-264
str_ag	Central, South America	Antigua and Barbuda	安提瓜和巴布达	ag	+1-268	AG	9	14	Antigua and Barbuda – +1-268
str_ar	Central, South America	Argentina	阿根廷	ar	+54	AR	10	15	Argentina – +54
str_am	Asia	Armenia	亚美尼亚	am	+374	AM	11	16	Armenia – +374
str_aw	Central, South America	Aruba	阿鲁巴岛	aw	+297	AW	12	17	Aruba – +297
str_au	Oceania	Australia	澳大利亚	au	+61	AU	13	18	Australia – +61
str_at	Europe	Austria	奥地利	at	+43	AT	14	19	Austria – +43
str_az	Asia	Azerbaijan	阿塞拜疆	az	+994	AZ	15	20	Azerbaijan – +994
str_bs	Central, South America	Bahamas	巴哈马	bs	+1-242	BS	16	21	Bahamas – +1-242
str_bh	Asia	Bahrain	巴林	bh	+973	BH	17	22	Bahrain – +973
str_bd	Asia	Bangladesh	孟加拉国	bd	+880	BD	18	23	Bangladesh – +880
str_bb	Central, South America	Barbados	巴巴多斯	bb	+1-246	BB	19	24	Barbados – +1-246
str_by	Europe	Belarus	白俄罗斯	by	+375	BY	20	25	Belarus – +375
str_be	Europe	Belgium	比利时	be	+32	BE	21	26	Belgium – +32
str_bz	Central, South America	Belize	伯利兹	bz	+501	BZ	22	27	Belize – +501
str_bj	Africa	Benin	贝宁	bj	+229	BJ	23	28	Benin – +229
str_bm	North Amercia	Bermuda	百慕大	bm	+1-441	BM	24	29	Bermuda – +1-441
str_bt	Asia	Bhutan	不丹	bt	+975	BT	25	30	Bhutan – +975
str_bo	Central, South America	Bolivia	玻利维亚	bo	+591	BO	26	31	Bolivia – +591
str_bq	Central, South America	Bonaire, Sint Eustatius and Saba	博内尔岛、圣尤斯特歇斯岛和萨巴岛	bq	+599	BQ	27	32	Bonaire, Sint Eustatius and Saba – +599
str_ba	Europe	Bosnia and Herzegovina	波斯尼亚和黑塞哥维那	ba	+387	BA	28	33	Bosnia and Herzegovina – +387
str_bw	Africa	Botswana	博茨瓦纳	bw	+267	BW	29	34	Botswana – +267
str_bv	Africa	Bouvet Island	布维岛	bv	+47	BV	30	35	Bouvet Island – +47
str_br	Central, South America	Brazil	巴西	br	+55	BR	31	36	Brazil – +55
str_io	Asia	British Indian Ocean Territory	英属印度洋领地	io	+246	IO	32	37	British Indian Ocean Territory – +246
str_vg	Central, South America	British Virgin Islands	英属维尔京群岛	vg	+1-284	VG	33	38	British Virgin Islands – +1-284
str_bn	Asia	Brunei	文莱	bn	+673	BN	34	39	Brunei Darussalam – +673
str_bg	Europe	Bulgaria	保加利亚	bg	+359	BG	35	40	Bulgaria – +359
str_bf	Africa	Burkina Faso	布基纳法索	bf	+226	BF	36	41	Burkina Faso – +226
str_bi	Africa	Burundi	布隆迪	bi	+257	BI	37	42	Burundi – +257
str_cv	Africa	Cabo Verde	佛得角	cv	+238	CV	38	43	Cabo Verde – +238
str_kh	Asia	Cambodia	柬埔寨	kh	+855	KH	39	44	Cambodia – +855
str_cm	Africa	Cameroon	喀麦隆	cm	+237	CM	40	45	Cameroon – +237
str_ca	North Amercia	Canada	加拿大	ca	+1	CA	41	46	Canada – +1
str_ky	Central, South America	Cayman Islands	开曼群岛	ky	+1-345	KY	42	47	Cayman Islands – +1-345
str_cf	Africa	Central African Republic	中非共和国	cf	+236	CF	43	48	Central African Republic – +236
str_td	Africa	Chad	乍得	td	+235	TD	44	49	Chad – +235
str_cl	Central, South America	Chile	智利	cl	+56	CL	45	50	Chile – +56
str_cn	Asia	China	中国	cn	+86	CN	46	51	China – +86
str_cx	Oceania	Christmas Island	圣诞岛	cx	+61	CX	47	52	Christmas Island – +61
str_cc	Oceania	Cocos (Keeling) Islands	科科斯（基林）岛屿	cc	+61	CC	48	53	Cocos (Keeling) Islands – +61
str_co	Central, South America	Colombia	哥伦比亚	co	+57	CO	49	54	Colombia – +57
str_km	Africa	Comoros	科摩罗	km	+269	KM	50	55	Comoros – +269
str_cd	Africa	Congo, Democratic Republic of the	刚果民主共和国	cd	+243	CD	51	56	Congo, Democratic Republic of the – +243
str_cg	Africa	Congo, Republic of the	刚果共和国	cg	+242	CG	52	57	Congo, Republic of the – +242
str_ck	Oceania	Cook Islands	库克群岛	ck	+682	CK	53	58	Cook Islands – +682
str_cr	Central, South America	Costa Rica	哥斯达黎加	cr	+506	CR	54	59	Costa Rica – +506
str_ci	Africa	Cote d'Ivoire	科特迪瓦	ci	+225	CI	55	60	Côte d'Ivoire – +225
str_hr	Europe	Croatia	克罗地亚	hr	+385	HR	56	61	Croatia – +385
str_cu	Central, South America	Cuba	古巴	cu	+53	CU	57	62	Cuba – +53
str_cw	Central, South America	Curaçao	库拉索	cw	+599	CW	58	63	Curaçao – +599
str_cy	Europe	Cyprus	塞浦路斯	cy	+357	CY	59	64	Cyprus – +357
str_cz	Europe	Czech Republic	捷克共和国	cz	+420	CZ	60	65	Czechia – +420
str_dk	Europe	Denmark	丹麦	dk	+45	DK	61	66	Denmark – +45
str_dj	Africa	Djibouti	吉布提	dj	+253	DJ	62	67	Djibouti – +253
str_dm	Central, South America	Dominica	多米尼克	dm	+1-767	DM	63	68	Dominica – +1-767
str_do	Central, South America	Dominican Republic	多米尼加共和国	do	+1-809, +1-829, +1-849	DO	64	69	Dominican Republic – +1-809, +1-829, +1-849
str_ec	Central, South America	Ecuador	厄瓜多尔	ec	+593	EC	65	70	Ecuador – +593
str_eg	Africa	Egypt	埃及	eg	+20	EG	66	71	Egypt – +20
str_sv	Central, South America	El Salvador	萨尔瓦多	sv	+503	SV	67	72	El Salvador – +503
str_gq	Africa	Equatorial Guinea	赤道几内亚	gq	+240	GQ	68	73	Equatorial Guinea – +240
str_er	Africa	Eritrea	厄立特里亚	er	+291	ER	69	74	Eritrea – +291
str_ee	Europe	Estonia	爱沙尼亚	ee	+372	EE	70	75	Estonia – +372
str_sz	Africa	Eswatini	斯威士兰	sz	+268	SZ	71	76	Eswatini – +268
str_et	Africa	Ethiopia	埃塞俄比亚	et	+251	ET	72	77	Ethiopia – +251
str_fk	Central, South America	Falkland Islands	福克兰群岛	fk	+500	FK	73	78	Falkland Islands – +500
str_fo	Europe	Faroe Islands	法罗群岛	fo	+298	FO	74	79	Faroe Islands – +298
str_fj	Oceania	Fiji	斐济	fj	+679	FJ	75	80	Fiji – +679
str_fi	Europe	Finland	芬兰	fi	+358	FI	76	81	Finland – +358
str_fr	Europe	France	法国	fr	+33	FR	77	82	France – +33
str_gf	Central, South America	French Guiana	法属圭亚那	gf	+594	GF	78	83	French Guiana – +594
str_pf	Oceania	French Polynesia	法属波利尼西亚	pf	+689	PF	79	84	French Polynesia – +689
str_tf	Africa	French Southern Territories	法属南部领地	tf	+262	TF	80	85	French Southern Territories – +262
str_ga	Africa	Gabon	加蓬	ga	+241	GA	81	86	Gabon – +241
str_gm	Africa	Gambia	冈比亚	gm	+220	GM	82	87	Gambia – +220
str_ge	Asia	Georgia	格鲁吉亚	ge	+995	GE	83	88	Georgia – +995
str_de	Europe	Germany	德国	de	+49	DE	84	89	Germany – +49
str_gh	Africa	Ghana	加纳	gh	+233	GH	85	90	Ghana – +233
str_gi	Europe	Gibraltar	直布罗陀	gi	+350	GI	86	91	Gibraltar – +350
str_gr	Europe	Greece	希腊	gr	+30	GR	87	92	Greece – +30
str_gl	Europe	Greenland	格陵兰	gl	+299	GL	88	93	Greenland – +299
str_gd	Central, South America	Grenada	格林纳达	gd	+1-473	GD	89	94	Grenada – +1-473
str_gp	Central, South America	Guadeloupe	瓜德罗普岛	gp	+590	GP	90	95	Guadeloupe – +590
str_gu	Oceania	Guam	关岛	gu	+1-671	GU	91	96	Guam – +1-671
str_gt	Central, South America	Guatemala	危地马拉	gt	+502	GT	92	97	Guatemala – +502
str_gg	Europe	Guernsey	格恩西岛	gg	+44-1481	GG	93	98	Guernsey – +44-1481
str_gn	Africa	Guinea	几内亚	gn	+224	GN	94	99	Guinea – +224
str_gw	Africa	Guinea-Bissau	几内亚比绍	gw	+245	GW	95	100	Guinea-Bissau – +245
str_gy	Central, South America	Guyana	圭亚那	gy	+592	GY	96	101	Guyana – +592
str_ht	Central, South America	Haiti	海地	ht	+509	HT	97	102	Haiti – +509
str_hm	Oceania	Heard Island and McDonald Islands	赫德岛和麦克唐纳群岛	hm	+61	HM	98	103	Heard Island and McDonald Islands – +61
str_va	Europe	Vatican City	梵蒂冈城市	va	+379	VA	99	104	Vatican City – +379
str_hn	Central, South America	Honduras	洪都拉斯	hn	+504	HN	100	105	Honduras – +504
str_hk	Asia	Hong Kong	香港	hk	+852	HK	101	106	Hong Kong – +852
str_hu	Europe	Hungary	匈牙利	hu	+36	HU	102	107	Hungary – +36
str_is	Europe	Iceland	冰岛	is	+354	IS	103	108	Iceland – +354
str_in	Asia	India	印度	in	+91	IN	104	109	India – +91
str_id	Asia	Indonesia	印度尼西亚	id	+62	ID	105	110	Indonesia – +62
str_ir	Asia	Iran	伊朗	ir	+98	IR	106	111	Iran – +98
str_iq	Asia	Iraq	伊拉克	iq	+964	IQ	107	112	Iraq – +964
str_ie	Europe	Ireland	爱尔兰	ie	+353	IE	108	113	Ireland – +353
str_im	Europe	Isle of Man	马恩岛	im	+44-1624	IM	109	114	Isle of Man – +44-1624
str_il	Asia	Israel	以色列	il	+972	IL	110	115	Israel – +972
str_it	Europe	Italy	意大利	it	+39	IT	111	116	Italy – +39
str_jm	Central, South America	Jamaica	牙买加	jm	+1-876	JM	112	117	Jamaica – +1-876
str_jp	Asia	Japan	日本	jp	+81	JP	113	118	Japan – +81
str_je	Europe	Jersey	泽西岛	je	+44-1534	JE	114	119	Jersey – +44-1534
str_jo	Asia	Jordan	约旦	jo	+962	JO	115	120	Jordan – +962
str_kz	Asia	Kazakhstan	哈萨克斯坦	kz	+7	KZ	116	121	Kazakhstan – +7
str_ke	Africa	Kenya	肯尼亚	ke	+254	KE	117	122	Kenya – +254
str_ki	Oceania	Kiribati	基里巴斯	ki	+686	KI	118	123	Kiribati – +686
str_kp	Asia	South Korea	韩国	kp	+850	KP	119	124	South Korea – +850
str_kr	Asia	North Korea	朝鲜	kr	+82	KR	120	125	North Korea – +82
str_xk	Europe	Kosovo	科索沃	xk	+383	XK	121	126	Kosovo – +383
str_kw	Asia	Kuwait	科威特	kw	+965	KW	122	127	Kuwait – +965
str_kg	Asia	Kyrgyzstan	吉尔吉斯斯坦	kg	+996	KG	123	128	Kyrgyzstan – +996
str_la	Asia	Laos	老挝	la	+856	LA	124	129	Laos – +856
str_lv	Europe	Latvia	拉脱维亚	lv	+371	LV	125	130	Latvia – +371
str_lb	Asia	Lebanon	黎巴嫩	lb	+961	LB	126	131	Lebanon – +961
str_ls	Africa	Lesotho	莱索托	ls	+266	LS	127	132	Lesotho – +266
str_lr	Africa	Liberia	利比里亚	lr	+231	LR	128	133	Liberia – +231
str_ly	Africa	Libya	利比亚	ly	+218	LY	129	134	Libya – +218
str_li	Europe	Liechtenstein	列支敦士登	li	+423	LI	130	135	Liechtenstein – +423
str_lt	Europe	Lithuania	立陶宛	lt	+370	LT	131	136	Lithuania – +370
str_lu	Europe	Luxembourg	卢森堡	lu	+352	LU	132	137	Luxembourg – +352
str_mo	Asia	Macao	澳门	mo	+853	MO	133	138	Macao – +853
str_mg	Africa	Madagascar	马达加斯加	mg	+261	MG	134	139	Madagascar – +261
str_mw	Africa	Malawi	马拉维	mw	+265	MW	135	140	Malawi – +265
str_my	Asia	Malaysia	马来西亚	my	+60	MY	136	141	Malaysia – +60
str_mv	Asia	Maldives	马尔代夫	mv	+960	MV	137	142	Maldives – +960
str_ml	Africa	Mali	马里	ml	+223	ML	138	143	Mali – +223
str_mt	Europe	Malta	马耳他	mt	+356	MT	139	144	Malta – +356
str_mh	Oceania	Marshall Islands	马绍尔群岛岛屿	mh	+692	MH	140	145	Marshall Islands – +692
str_mq	Central, South America	Martinique	马提尼克岛	mq	+596	MQ	141	146	Martinique – +596
str_mr	Africa	Mauritania	毛里塔尼亚	mr	+222	MR	142	147	Mauritania – +222
str_mu	Africa	Mauritius	毛里求斯	mu	+230	MU	143	148	Mauritius – +230
str_yt	Africa	Mayotte	马约特岛	yt	+262	YT	144	149	Mayotte – +262
str_mx	Central, South America	Mexico	墨西哥	mx	+52	MX	145	150	Mexico – +52
str_fm	Oceania	Micronesia	密克罗尼西亚	fm	+691	FM	146	151	Micronesia – +691
str_md	Europe	Moldova	摩尔多瓦	md	+373	MD	147	152	Moldova – +373
str_mc	Europe	Monaco	摩纳哥	mc	+377	MC	148	153	Monaco – +377
str_mn	Asia	Mongolia	蒙古	mn	+976	MN	149	154	Mongolia – +976
str_me	Europe	Montenegro	黑山	me	+382	ME	150	155	Montenegro – +382
str_ms	Central, South America	Montserrat	蒙特塞拉特	ms	+1-664	MS	151	156	Montserrat – +1-664
str_ma	Africa	Morocco	摩洛哥	ma	+212	MA	152	157	Morocco – +212
str_mz	Africa	Mozambique	莫桑比克	mz	+258	MZ	153	158	Mozambique – +258
str_mm	Asia	Myanmar	缅甸	mm	+95	MM	154	159	Myanmar – +95
str_na	Africa	Namibia	纳米比亚	na	+264	NA	155	160	Namibia – +264
str_nr	Oceania	Nauru	瑙鲁	nr	+674	NR	156	161	Nauru – +674
str_np	Asia	Nepal	尼泊尔	np	+977	NP	157	162	Nepal – +977
str_nl	Europe	Netherlands	荷兰	nl	+31	NL	158	163	Netherlands – +31
str_nc	Oceania	New Caledonia	新喀里多尼亚	nc	+687	NC	159	164	New Caledonia – +687
str_nz	Oceania	New Zealand	新西兰	nz	+64	NZ	160	165	New Zealand – +64
str_ni	Central, South America	Nicaragua	尼加拉瓜	ni	+505	NI	161	166	Nicaragua – +505
str_ne	Africa	Niger	尼日尔	ne	+227	NE	162	167	Niger – +227
str_ng	Africa	Nigeria	尼日利亚	ng	+234	NG	163	168	Nigeria – +234
str_nu	Oceania	Niue	纽埃	nu	+683	NU	164	169	Niue – +683
str_nf	Oceania	Norfolk Island	诺福克岛	nf	+672	NF	165	170	Norfolk Island – +672
str_mk	Europe	North Macedonia	北马其顿	mk	+389	MK	166	171	North Macedonia – +389
str_mp	Oceania	Northern Mariana Islands	北马里亚纳群岛	mp	+1-670	MP	167	172	Northern Mariana Islands – +1-670
str_no	Europe	Norway	挪威	no	+47	NO	168	173	Norway – +47
str_om	Asia	Oman	阿曼	om	+968	OM	169	174	Oman – +968
str_pk	Asia	Pakistan	巴基斯坦	pk	+92	PK	170	175	Pakistan – +92
str_pw	Oceania	Palau	帕劳	pw	+680	PW	171	176	Palau – +680
str_ps	Asia	Palestine	巴勒斯坦	ps	+970	PS	172	177	Palestine – +970
str_pa	Central, South America	Panama	巴拿马	pa	+507	PA	173	178	Panama – +507
str_pg	Oceania	Papua New Guinea	巴布亚新几内亚	pg	+675	PG	174	179	Papua New Guinea – +675
str_py	Central, South America	Paraguay	巴拉圭	py	+595	PY	175	180	Paraguay – +595
str_pe	Central, South America	Peru	秘鲁	pe	+51	PE	176	181	Peru – +51
str_ph	Asia	Philippines	菲律宾	ph	+63	PH	177	182	Philippines – +63
str_pn	Oceania	Pitcairn	皮特凯恩群岛	pn	+64	PN	178	183	Pitcairn – +64
str_pl	Europe	Poland	波兰	pl	+48	PL	179	184	Poland – +48
str_pt	Europe	Portugal	葡萄牙	pt	+351	PT	180	185	Portugal – +351
str_pr	Central, South America	Puerto Rico	波多黎各	pr	+1-787, +1-939	PR	181	186	Puerto Rico – +1-787, +1-939
str_qa	Asia	Qatar	卡塔尔	qa	+974	QA	182	187	Qatar – +974
str_re	Africa	Reunion	留尼汪岛	re	+262	RE	183	188	Réunion – +262
str_ro	Europe	Romania	罗马尼亚	ro	+40	RO	184	189	Romania – +40
str_ru	Europe	Russia	俄罗斯	ru	+7	RU	185	190	Russia – +7
str_rw	Africa	Rwanda	卢旺达	rw	+250	RW	186	191	Rwanda – +250
str_bl	Central, South America	Saint Barthélemy	圣巴塞洛缪群岛	bl	+590	BL	187	192	Saint Barthélemy – +590
str_sh	Africa	Saint Helena	圣赫勒拿岛	sh	+290	SH	188	193	Saint Helena – +290
str_kn	Central, South America	Saint Kitts and Nevis	圣基茨和尼维斯	kn	+1-869	KN	189	194	Saint Kitts and Nevis – +1-869
str_lc	Central, South America	Saint Lucia	圣卢西亚	lc	+1-758	LC	190	195	Saint Lucia – +1-758
str_mf	Central, South America	Saint Martin (French part)	圣马丁岛（法属部分）	mf	+590	MF	191	196	Saint Martin (French part) – +590
str_pm	North Amercia	Saint Pierre and Miquelon (French part)	圣彼得和密克隆群岛（法语部分）	pm	+508	PM	192	197	Saint Pierre and Miquelon (French part) – +508
str_vc	Central, South America	Saint Vincent and the Grenadines	圣文森特和格林纳丁斯	vc	+1-784	VC	193	198	Saint Vincent and the Grenadines – +1-784
str_ws	Oceania	Samoa	萨摩亚	ws	+685	WS	194	199	Samoa – +685
str_sm	Europe	San Marino	圣马力诺	sm	+378	SM	195	200	San Marino – +378
str_st	Africa	Sao Tome and Principe	圣多美和普林西比	st	+239	ST	196	201	Sao Tome and Principe – +239
str_sa	Asia	Saudi Arabia	沙特阿拉伯	sa	+966	SA	197	202	Saudi Arabia – +966
str_sn	Africa	Senegal	塞内加尔	sn	+221	SN	198	203	Senegal – +221
str_rs	Europe	Serbia	塞尔维亚	rs	+381	RS	199	204	Serbia – +381
str_sc	Africa	Seychelles	塞舌尔	sc	+248	SC	200	205	Seychelles – +248
str_sl	Africa	Sierra Leone	塞拉利昂	sl	+232	SL	201	206	Sierra Leone – +232
str_sg	Asia	Singapore	新加坡	sg	+65	SG	202	207	Singapore – +65
str_sx	Central, South America	Sint Maarten (Dutch part)	圣马丁岛（荷兰语部分）	sx	+1-721	SX	203	208	Sint Maarten (Dutch part) – +1-721
str_sk	Europe	Slovakia	斯洛伐克	sk	+421	SK	204	209	Slovakia – +421
str_si	Europe	Slovenia	斯洛文尼亚	si	+386	SI	205	210	Slovenia – +386
str_sb	Oceania	Solomon Islands	所罗门群岛	sb	+677	SB	206	211	Solomon Islands – +677
str_so	Africa	Somalia	索马里	so	+252	SO	207	212	Somalia – +252
str_za	Africa	South Africa	南非	za	+27	ZA	208	213	South Africa – +27
str_gs	Central, South America	South Georgia and the South Sandwich Islands	南乔治亚和南桑威奇群岛	gs	+500	GS	209	214	South Georgia and the South Sandwich Islands – +500
str_ss	Africa	South Sudan	南苏丹	ss	+211	SS	210	215	South Sudan – +211
str_es	Europe	Spain	西班牙	es	+34	ES	211	216	Spain – +34
str_lk	Asia	Sri Lanka	斯里兰卡	lk	+94	LK	212	217	Sri Lanka – +94
str_sd	Africa	Sudan	苏丹	sd	+249	SD	213	218	Sudan – +249
str_sr	Central, South America	Suriname	苏里南	sr	+597	SR	214	219	Suriname – +597
str_sj	Europe	Svalbard and Jan Mayen	斯瓦尔巴群岛和扬马延岛	sj	+47	SJ	215	220	Svalbard and Jan Mayen – +47
str_se	Europe	Sweden	瑞典	se	+46	SE	216	221	Sweden – +46
str_ch	Europe	Switzerland	瑞士	ch	+41	CH	217	222	Switzerland – +41
str_sy	Asia	Syria	叙利亚	sy	+963	SY	218	223	Syrian Arab Republic – +963
str_tw	Asia	Taiwan	台湾	tw	+886	TW	219	224	Taiwan – +886
str_tj	Asia	Tajikistan	塔吉克斯坦	tj	+992	TJ	220	225	Tajikistan – +992
str_tz	Africa	Tanzania	坦桑尼亚	tz	+255	TZ	221	226	Tanzania – +255
str_th	Asia	Thailand	泰国	th	+66	TH	222	227	Thailand – +66
str_tl	Asia	Timor-Leste	东帝汶	tl	+670	TL	223	228	Timor-Leste – +670
str_tg	Africa	Togo	多哥	tg	+228	TG	224	229	Togo – +228
str_tk	Oceania	Tokelau	托克劳	tk	+690	TK	225	230	Tokelau – +690
str_to	Oceania	Tonga	汤加	to	+676	TO	226	231	Tonga – +676
str_tt	Central, South America	Trinidad and Tobago	特立尼达和多巴哥	tt	+1-868	TT	227	232	Trinidad and Tobago – +1-868
str_tn	Africa	Tunisia	突尼斯	tn	+216	TN	228	233	Tunisia – +216
str_tr	Asia	Turkey (Türkiye)	土耳其	tr	+90	TR	229	234	Turkey (Türkiye) – +90
str_tm	Asia	Turkmenistan	土库曼斯坦	tm	+993	TM	230	235	Turkmenistan – +993
str_tc	Central, South America	Turks and Caicos Islands	特克斯和凯科斯群岛	tc	+1-649	TC	231	236	Turks and Caicos Islands – +1-649
str_tv	Oceania	Tuvalu	图瓦卢	tv	+688	TV	232	237	Tuvalu – +688
str_ug	Africa	Uganda	乌干达	ug	+256	UG	233	238	Uganda – +256
str_ua	Europe	Ukraine	乌克兰	ua	+380	UA	234	239	Ukraine – +380
str_ae	Asia	United Arab Emirates	阿拉伯联合酋长国	ae	+971	AE	235	240	United Arab Emirates – +971
str_gb	Europe	United Kingdom	英国	gb	+44	GB	236	241	United Kingdom – +44
str_um	Asia	United States Minor Outlying Islands	美国海外岛屿	um	+1	UM	237	242	United States Minor Outlying Islands – +1
str_us	North Amercia	United States	美国	us	+1	US	238	243	United States – +1
str_vi	Central, South America	United States Virgin Islands	美属维尔京群岛	vi	+1-340	VI	239	244	United States Virgin Islands – +1-340
str_uy	Central, South America	Uruguay	乌拉圭	uy	+598	UY	240	245	Uruguay – +598
str_uz	Asia	Uzbekistan	乌兹别克斯坦	uz	+998	UZ	241	246	Uzbekistan – +998
str_vu	Oceania	Vanuatu	瓦努阿图	vu	+678	VU	242	247	Vanuatu – +678
str_ve	Central, South America	Venezuela	委内瑞拉	ve	+58	VE	243	248	Venezuela – +58
str_vn	Asia	Vietnam	越南	vn	+84	VN	244	249	Viet Nam – +84
str_wf	Oceania	Wallis and Futuna	瓦利斯和富图纳群岛	wf	+681	WF	245	250	Wallis and Futuna – +681
str_eh	Africa	Western Sahara	西撒哈拉	eh	+212	EH	246	251	Western Sahara – +212
str_ye	Asia	Yemen	也门	ye	+967	YE	247	252	Yemen – +967
str_zm	Africa	Zambia	赞比亚	zm	+260	ZM	248	253	Zambia – +260
str_zw	Africa	Zimbabwe	津巴布韦	zw	+263	ZW	249	254	Zimbabwe – +263
`.trim()

export const WAREHOUSE_REGION_SEEDS = WAREHOUSE_ROWS.split("\n").map((line) => {
  const [
    id,
    code,
    name_en,
    name_zh,
    country_code,
    s2bdiy_count,
    enabled,
    notes,
    sort_order,
    source_row,
    shipping_from,
    shipping_from_zh,
  ] = line.split("\t")

  return {
    id,
    code,
    name_en,
    name_zh,
    country_code,
    s2bdiy_count: parseNumber(s2bdiy_count),
    enabled: enabled === "true",
    notes,
    sort_order: Number(sort_order),
    raw_json: {
      source_sheet: "仓库地区",
      source_row: Number(source_row),
      shipping_from,
      shipping_from_zh,
    },
  }
}) satisfies WarehouseRegionSeed[]

export const SHIP_TO_REGION_SEEDS = SHIP_TO_ROWS.split("\n").map((line) => {
  const [
    id,
    zone,
    country_region_en,
    country_region_zh,
    country_code,
    phone_code,
    abbreviation,
    sort_order,
    source_row,
    country_code_label,
  ] = line.split("\t")

  return {
    id,
    zone,
    country_region_en,
    country_region_zh,
    country_code,
    phone_code,
    abbreviation,
    enabled: true,
    blocked: false,
    blocked_reason: "",
    sort_order: Number(sort_order),
    raw_json: {
      source_sheet: "物流，可配送地区",
      source_row: Number(source_row),
      country_code_label,
    },
  }
}) satisfies ShipToRegionSeed[]

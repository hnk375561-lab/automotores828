# Inventario relevado de Mercado Libre — 21/10/2026

## Alcance y método

Se recorrió el perfil público del vendedor Automotores 828, las dos páginas observadas de autos y camionetas y la categoría de motos. Cada resultado se contrastó con una ficha individual y se registró por su ID de publicación, evitando contar dos veces un mismo ID. Para cada unidad se conservaron la URL directa, el precio y la moneda observados, los atributos publicados por el vendedor y todas las imágenes de galería accesibles en ese momento. La lista estructurada de fuentes y la trazabilidad por ficha están en `data/sources.json` y `data/vehicles.json`.

La descarga local conserva el archivo WebP original obtenido de la URL de alta resolución de Mercado Libre; además crea derivados separados para la portada de tarjeta y las miniaturas, sin sustituir el original. Cada imagen registra URL fuente, dimensiones y ruta local.

## Resultado de la captura

- **Publicaciones individuales integradas:** 58 IDs únicos.
- **Autos y camionetas:** 50 publicaciones, 665 fotografías.
- **Motos:** 8 publicaciones, 106 fotografías.
- **Fotografías detectadas, descargadas e integradas:** 771.
- **Corte de datos:** 2026-10-21. Los precios se muestran con moneda y fecha; no son cotización en tiempo real.

## Fuentes de listado revisadas

- Perfil de vehículos: https://vehiculos.mercadolibre.com.ar/_CustId_121360385?utm_source
- Autos y camionetas, primera página: https://autos.mercadolibre.com.ar/_CustId_121360385?utm_source
- Autos y camionetas, segunda página: https://autos.mercadolibre.com.ar/_Desde_49_CustId_121360385
- Motos: https://motos.mercadolibre.com.ar/_CustId_121360385

Las fichas individuales son la fuente primaria de cada fila y están enlazadas directamente. La tabla resume lo observado y permite cotejar el número de fotografías por anuncio:

| Tipo | ID | Publicación | Año | Kilometraje | Precio observado | Fotos | Ficha fuente |
|---|---:|---|---:|---:|---:|---:|---|
| Auto | 4103009836 | Honda Fit 2014 1.4 Lx-l Mt 100cv | 2014 | 204.000 km | US$ 10.000 (2026-10-21) | 16 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4103009836-honda-fit-14-lx-l-mt-100cv-_JM) |
| Auto | 2137817901 | Peugeot 208 2021 1.6l Active | 2021 | 81.500 km | $ 21.000.000 (2026-10-21) | 16 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2137817901-peugeot-208-16l-active-_JM) |
| Auto | 2185939777 | Renault Sandero Stepway 2014 1.6 Confort 105cv | 2014 | 200.000 km | $ 13.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2185939777-renault-sandero-stepway-16-confort-105cv-_JM) |
| Auto | 2032707077 | Peugeot 2008 2021 1.6 Feline | 2021 | 137.800 km | $ 21.000.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2032707077-peugeot-2008-16-feline-_JM) |
| Auto | 2191782749 | Peugeot 208 2019 1.6 Allure | 2019 | 53.000 km | $ 17.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2191782749-peugeot-208-16-allure-_JM) |
| Auto | 2116059721 | Fiat Palio 2013 1.4 Weekend Attractive 87cv | 2013 | 183.800 km | $ 12.000.000 (2026-10-21) | 16 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2116059721-fiat-palio-14-weekend-attractive-87cv-_JM) |
| Auto | 3962722820 | Peugeot 208 2016 1.5 Allure Touchscreen | 2016 | 80.000 km | $ 14.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3962722820-peugeot-208-15-allure-touchscreen-_JM) |
| Auto | 2140604399 | Citroën C4 Lounge 2020 1.6 Vti 115 Live | 2020 | 116.000 km | $ 18.500.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2140604399-citron-c4-lounge-16-vti-115-live-_JM) |
| Auto | 2090433129 | Toyota Yaris 2021 1.5 107cv Xls Cvt | 2021 | 111.000 km | $ 25.000.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2090433129-toyota-yaris-15-107cv-xls-cvt-_JM) |
| Auto | 4049171736 | Renault Duster 2018 1.6 Ph2 4x2 Dynamique | 2018 | 170.000 km | $ 18.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4049171736-renault-duster-16-ph2-4x2-dynamique-_JM) |
| Auto | 3839696394 | Ford Fiesta Kinetic 2016 1.6 Se 120cv | 2016 | 128.900 km | $ 15.500.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3839696394-ford-fiesta-kinetic-16-se-120cv-_JM) |
| Auto | 3745641530 | Peugeot 208 2016 1.6 Allure Nav Tiptronic | 2016 | 114.000 km | $ 15.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3745641530-peugeot-208-16-allure-nav-tiptronic-_JM) |
| Auto | 1982665981 | Citroën C3 2016 1.6 Vti 115 Shine | 2016 | 105.000 km | $ 15.000.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-1982665981-citron-c3-16-vti-115-shine-_JM) |
| Auto | 2164403203 | Ford Fiesta Kinetic 2017 1.6 S | 2017 | 107.000 km | $ 15.500.000 (2026-10-21) | 10 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2164403203-ford-fiesta-kinetic-16-s-_JM) |
| Auto | 4045139284 | Volkswagen Up! 2016 1.0 High Up! 75cv | 2016 | 141.000 km | $ 13.000.000 (2026-10-21) | 10 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4045139284-volkswagen-up-10-high-up-75cv-_JM) |
| Auto | 2060553841 | Volkswagen Gol Trend 2019 1.6 Trendline 101cv | 2019 | 121.100 km | $ 17.500.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2060553841-volkswagen-gol-trend-16-trendline-101cv-_JM) |
| Auto | 4081416070 | Ford Ka 2016 1.5 S | 2016 | 135.700 km | $ 15.000.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4081416070-ford-ka-15-s-_JM) |
| Auto | 2165221307 | Volkswagen Up! 2016 1.0 Take Up! Aa 75cv 3p | 2016 | 141.000 km | US$ 11.800 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2165221307-volkswagen-up-10-take-up-aa-75cv-3p-_JM) |
| Auto | 4035984788 | Citroën C3 Picasso 2013 1.6 Exclusive 110cv | 2013 | 171.000 km | $ 11.500.000 (2026-10-21) | 11 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4035984788-citron-c3-picasso-16-exclusive-110cv-_JM) |
| Auto | 2063195983 | Peugeot 408 2015 1.6 Feline Hdi 115cv | 2015 | 170.000 km | $ 15.000.000 (2026-10-21) | 11 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2063195983-peugeot-408-16-feline-hdi-115cv-_JM) |
| Auto | 2164327687 | Ford Fiesta Kinetic 2016 1.6 S 120cv | 2016 | 148.900 km | $ 14.500.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2164327687-ford-fiesta-kinetic-16-s-120cv-_JM) |
| Auto | 2057558089 | Renault Duster 2018 1.6 Ph2 4x2 Expression | 2018 | 125.000 km | $ 21.000.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2057558089-renault-duster-16-ph2-4x2-expression-_JM) |
| Auto | 2128200017 | Citroën C4 Cactus 2019 1.6 Vti 115 Feel | 2019 | 50.500 km | $ 19.000.000 (2026-10-21) | 11 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2128200017-citron-c4-cactus-16-vti-115-feel-_JM) |
| Auto | 4036030430 | Toyota Corolla 2016 1.8 Xei Mt Pack 140cv | 2016 | 149.000 km | US$ 14.500 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4036030430-toyota-corolla-18-xei-mt-pack-140cv-_JM) |
| Auto | 2164369907 | Fiat Cronos 2022 1.3 Gse Drive | 2022 | 100.000 km | $ 18.000.000 (2026-10-21) | 11 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2164369907-fiat-cronos-13-gse-drive-_JM) |
| Auto | 2036182413 | Citroën C3 2019 1.6 Vti 115 At6 Feel | 2019 | 45.600 km | $ 18.000.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2036182413-citron-c3-16-vti-115-at6-feel-_JM) |
| Auto | 4073718400 | Honda Fit 2012 1.5 Ex-l At 120cv | 2012 | 150.000 km | US$ 11.800 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4073718400-honda-fit-15-ex-l-at-120cv-_JM) |
| Auto | 4099578036 | Jeep Renegade 2018 1.8 Sport At | 2018 | 69.900 km | US$ 15.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4099578036-jeep-renegade-18-sport-at-_JM) |
| Auto | 4043980626 | Ford Ka 2018 1.5 Se | 2018 | 120.300 km | $ 15.500.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4043980626-ford-ka-15-se-_JM) |
| Auto | 2032158299 | Fiat Argo 2026 1.3 Drive | 2026 | 0 km | $ 28.000.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2032158299-fiat-argo-13-drive-_JM) |
| Auto | 4036169954 | Renault Sandero 2023 1.6 16v Intens | 2023 | 8.400 km | $ 22.500.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4036169954-renault-sandero-16-16v-intens-_JM) |
| Auto | 2063192705 | Volkswagen Gol Trend 2020 1.6 Trendline 101cv | 2020 | 106.000 km | $ 18.000.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2063192705-volkswagen-gol-trend-16-trendline-101cv-_JM) |
| Auto | 2069940821 | Ford Ka 2018 1.5 S | 2018 | 109.900 km | $ 15.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2069940821-ford-ka-15-s-_JM) |
| Auto | 2063616163 | Volkswagen Golf 2017 1.4 Comfortline Tsi Dsg | 2017 | 170.000 km | $ 21.000.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2063616163-volkswagen-golf-14-comfortline-tsi-dsg-_JM) |
| Auto | 3922900592 | Peugeot 408 2012 2.0 Feline 143cv | 2012 | 184.800 km | $ 12.500.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3922900592-peugeot-408-20-feline-143cv-_JM) |
| Auto | 2164036085 | Chevrolet S10 2015 2.8 Cd 4x2 Ltz Tdci 200cv | 2015 | 129.200 km | US$ 21.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2164036085-chevrolet-s10-28-cd-4x2-ltz-tdci-200cv-_JM) |
| Auto | 2080295489 | Chevrolet Meriva 2011 1.8 Gls | 2011 | 170.000 km | $ 10.000.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2080295489-chevrolet-meriva-18-gls-_JM) |
| Auto | 3911569720 | Peugeot 307 2010 2.0 Sedan Hdi Xs 110cv | 2010 | 177.260 km | $ 10.000.000 (2026-10-21) | 10 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3911569720-peugeot-307-20-sedan-hdi-xs-110cv-_JM) |
| Auto | 1957627121 | Jeep Renegade 2018 2.0 Trailhawk At9 4x4 | 2018 | 97.100 km | US$ 22.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-1957627121-jeep-renegade-20-trailhawk-at9-4x4-_JM) |
| Auto | 3962982670 | Honda Civic 2018 2.0 Ex Cvt | 2018 | 145.000 km | US$ 19.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3962982670-honda-civic-20-ex-cvt-_JM) |
| Auto | 2168683951 | Renault Logan 2023 1.6 16v Intense | 2023 | 103.300 km | $ 20.000.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2168683951-renault-logan-16-16v-intense-_JM) |
| Auto | 4017993224 | Toyota Etios 2017 1.5 Xls At | 2017 | 179.000 km | $ 17.500.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4017993224-toyota-etios-15-xls-at-_JM) |
| Auto | 4004324338 | Chevrolet Prisma 2018 1.4 Lt 98cv | 2018 | 180.000 km | $ 14.500.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4004324338-chevrolet-prisma-14-lt-98cv-_JM) |
| Auto | 3922903672 | Suzuki Vitara 1992 1.6 Jlx Sidekick | 1992 | 320.000 km | US$ 9.000 (2026-10-21) | 12 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3922903672-suzuki-vitara-16-jlx-sidekick-_JM) |
| Auto | 2163985589 | Citroën Xsara Picasso 2010 2.0 Fase2 Hdi Exclusive | 2010 | 225.000 km | $ 9.500.000 (2026-10-21) | 9 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2163985589-citron-xsara-picasso-20-fase2-hdi-exclusive-_JM) |
| Auto | 3910583314 | Ford Focus Iii 2016 2.0 Titanium Mt | 2016 | 122.800 km | $ 19.000.000 (2026-10-21) | 14 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3910583314-ford-focus-iii-20-titanium-mt-_JM) |
| Auto | 2163981297 | BMW Serie 3 1999 323 Ti 2.3 | 1999 | 201.000 km | US$ 11.500 (2026-10-21) | 17 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-2163981297-bmw-323-ti-23-_JM) |
| Auto | 4043971584 | Fiat Siena 2015 1.6 El 16v | 2015 | 202.200 km | $ 12.000.000 (2026-10-21) | 13 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-4043971584-fiat-siena-16-el-16v-_JM) |
| Auto | 3783768058 | Toyota Hilux Sw4 1998 3.0 I Runner | 1998 | 286.300 km | US$ 17.000 (2026-10-21) | 20 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3783768058-toyota-hilux-sw4-30-i-runner-_JM) |
| Auto | 3791837716 | Chevrolet Blazer 2007 2.8 Dlx I 4x4 | 2007 | 190.600 km | US$ 12.000 (2026-10-21) | 15 | [Abrir publicación](https://auto.mercadolibre.com.ar/MLA-3791837716-chevrolet-blazer-28-dlx-i-4x4-_JM) |
| Moto | 3906233690 | Naked Fc Moto Nk 450 | 2026 | 723 km | $ 9.200.000 (2026-10-21) | 11 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-3906233690-naked-fc-moto-nk-450-_JM) |
| Moto | 3709815626 | Scooter Vespa Vxl 150 | 2024 | 2.700 km | $ 4.300.000 (2026-10-21) | 15 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-3709815626-scooter-vespa-vxl-150-_JM) |
| Moto | 2057548019 | Naked Bajaj Rouser Ns 250 | 2024 | 4.000 km | $ 5.500.000 (2026-10-21) | 13 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-2057548019-naked-bajaj-rouser-ns-250-_JM) |
| Moto | 4044169596 | Honda Xtz 250 | 2011 | 29.000 km | US$ 4.000 (2026-10-21) | 10 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-4044169596-honda-xtz-250-_JM) |
| Moto | 3906245030 | Motomel Skua 250 | 2025 | 800 km | $ 3.400.000 (2026-10-21) | 16 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-3906245030-motomel-skua-250-_JM) |
| Moto | 2063173351 | Scooter Honda Biz 125 | 2016 | 15.900 km | US$ 2.300 (2026-10-21) | 14 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-2063173351-scooter-honda-biz-125-_JM) |
| Moto | 2044852281 | Naked Benelli Leoncino 250 | 2021 | 9.700 km | US$ 3.500 (2026-10-21) | 14 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-2044852281-naked-benelli-leoncino-250-_JM) |
| Moto | 2057558975 | Naked Bajaj Rouser Ns 250 | 2024 | 21.300 km | $ 4.700.000 (2026-10-21) | 13 | [Abrir publicación](https://moto.mercadolibre.com.ar/MLA-2057558975-naked-bajaj-rouser-ns-250-_JM) |

## Límites y actualización

Esta tabla es una fotografía del catálogo público del 21/10/2026, no una sincronización permanente. Que una ficha estuviera accesible durante el relevamiento no confirma que siga disponible, conserve su precio o corresponda a un vehículo físicamente inspeccionado; confirmar todo directamente con Automotores 828 antes de ofrecer o comprar. Los datos técnicos y el equipamiento son los declarados por el vendedor. No se extrapolan condiciones de financiación entre publicaciones ni se afirma que una unidad fue vendida sin evidencia.

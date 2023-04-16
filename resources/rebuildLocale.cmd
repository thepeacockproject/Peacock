REM Global
set c=resources\rpkg-cli.exe
set l=resources\HMLanguageTools.exe

REM H2
%l% rebuild H2 LOCR resources/locale_h2.json resources/dynamic_resources_h2/00962CB9FEA57C86.LOCR --metapath resources/dynamic_resources_h2/00962CB9FEA57C86.LOCR.meta.json
%c% -output_path resources -generate_rpkg_from resources/dynamic_resources_h2

REM H3
%l% rebuild H3 LOCR resources/locale_h3.json resources/dynamic_resources_h3/00962CB9FEA57C86.LOCR --metapath resources/dynamic_resources_h3/00962CB9FEA57C86.LOCR.meta.json
%c% -output_path resources -generate_rpkg_from resources/dynamic_resources_h3

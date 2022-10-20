REM Global
set c=resources\rpkg-cli.exe
%c% -output_path resources -extract_locr_to_json_from resources

REM H2
copy resources\locale_h2.json resources\dynamic_resources_h2\LOCR\00962CB9FEA57C86.LOCR.JSON
copy resources\LOCR\dynamic_resources_h2.rpkg\00962CB9FEA57C86.LOCR.JSON.meta resources\dynamic_resources_h2\LOCR\00962CB9FEA57C86.LOCR.JSON.meta
%c% -output_path resources/dynamic_resources_h2/LOCR -rebuild_locr_from_json_from resources/dynamic_resources_h2/LOCR
copy resources\dynamic_resources_h2\LOCR\LOCR.rebuilt\00962CB9FEA57C86.LOCR resources\dynamic_resources_h2\LOCR\00962CB9FEA57C86.LOCR
rd /S /Q resources\dynamic_resources_h2\LOCR\LOCR.rebuilt
%c% -output_path resources -generate_rpkg_from resources/dynamic_resources_h2

REM H3
copy resources\locale_h3.json resources\dynamic_resources_h3\LOCR\00962CB9FEA57C86.LOCR.JSON
copy resources\LOCR\dynamic_resources_h3.rpkg\00962CB9FEA57C86.LOCR.JSON.meta resources\dynamic_resources_h3\LOCR\00962CB9FEA57C86.LOCR.JSON.meta
%c% -output_path resources/dynamic_resources_h3/LOCR -rebuild_locr_from_json_from resources/dynamic_resources_h3/LOCR
copy resources\dynamic_resources_h3\LOCR\LOCR.rebuilt\00962CB9FEA57C86.LOCR resources\dynamic_resources_h3\LOCR\00962CB9FEA57C86.LOCR
rd /S /Q resources\dynamic_resources_h3\LOCR\LOCR.rebuilt
%c% -output_path resources -generate_rpkg_from resources/dynamic_resources_h3

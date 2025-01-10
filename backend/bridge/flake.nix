{
  inputs = {
    utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, utils }: utils.lib.eachDefaultSystem (system:
    let
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShell = pkgs.mkShell {
        buildInputs = with pkgs; [
          go
          xsel
          xclip
          libpng
          xorg.libX11.dev
          xorg.libXft
          xorg.libXinerama
          xorg.libxcb
          xorg.libxkbfile
          xorg.libXtst
          xorg.libXi.dev
          (pkgs.writeShellScriptBin "run" "go run .")
          (pkgs.writeShellScriptBin "build" "go build .")
        ];
      };
    }
  );
}


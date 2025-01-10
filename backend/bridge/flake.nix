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
          gopls
          xsel
          xclip
          libpng
          pkgsCross.mingwW64.buildPackages.gcc
          xorg.libX11.dev
          xorg.libXft
          xorg.libXinerama
          xorg.libxcb
          xorg.libxkbfile
          xorg.libXtst
          xorg.libXi.dev
          (pkgs.writeShellScriptBin "run" "go run .")
          (pkgs.writeShellScriptBin "build" "go build .")
          (pkgs.writeShellScriptBin "build-windows" "GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CXX=x86_64-w64-mingw32-g++ CC=x86_64-w64-mingw32-gcc go build .")
        ];
      };
    }
  );
}


{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
  flake-utils.lib.eachDefaultSystem (system:
    let pkgs = import nixpkgs { inherit system; }; in {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodePackages.typescript-language-server
          hugo
          pocketbase
          (pkgs.writeShellScriptBin "run" "hugo server -D")
        ];
      };
    }
  );
}

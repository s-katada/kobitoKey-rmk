{
  description = "KobitoKey RMK firmware dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, fenix, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        fenixPkgs = fenix.packages.${system};

        rustToolchain = fenixPkgs.combine [
          fenixPkgs.latest.cargo
          fenixPkgs.latest.rustc
          fenixPkgs.latest.rust-src
          fenixPkgs.latest.rust-analyzer
          fenixPkgs.latest.clippy
          fenixPkgs.latest.rustfmt
          fenixPkgs.targets.thumbv7em-none-eabihf.latest.rust-std
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            rustToolchain
            pkgs.cargo-make
            pkgs.cargo-binutils
            pkgs.flip-link
            pkgs.probe-rs-tools
            pkgs.pkg-config
            pkgs.xz
          ];

          RUST_SRC_PATH = "${fenixPkgs.latest.rust-src}/lib/rustlib/src/rust/library";
        };
      }
    );
}

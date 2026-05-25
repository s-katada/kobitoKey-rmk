{
  description = "KobitoKey RMK firmware + web editor dev environment";

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

        # RMK 公式の rust-toolchain.toml は stable を指定。
        # nightly に上げると `pin!` 周りの型推論差異でビルド不能になることがある。
        rustToolchain = fenixPkgs.combine [
          fenixPkgs.stable.cargo
          fenixPkgs.stable.rustc
          fenixPkgs.stable.rust-src
          fenixPkgs.stable.rust-analyzer
          fenixPkgs.stable.clippy
          fenixPkgs.stable.rustfmt
          fenixPkgs.stable.llvm-tools-preview
          fenixPkgs.targets.thumbv7em-none-eabihf.stable.rust-std
        ];

        # Web editor (Vite + React + TS). Node 22 系 + pnpm のみ提供し、
        # Rust toolchain は持ち込まない (web/.envrc から `#web` を使う)。
        webDevShell = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.biome
          ];
        };
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
            pkgs.llvmPackages_latest.libclang
          ];

          LIBCLANG_PATH = "${pkgs.llvmPackages_latest.libclang.lib}/lib";
          RUST_SRC_PATH = "${fenixPkgs.stable.rust-src}/lib/rustlib/src/rust/library";
        };

        devShells.web = webDevShell;
      }
    );
}

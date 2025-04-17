import { MindData } from './types'

export const languagesData: MindData = {
  nodes: [
    // 基础语言（祖先级）
    { id: 'algol', name: 'ALGOL (1958)' },
    { id: 'lisp', name: 'LISP (1958)' },
    { id: 'cobol', name: 'COBOL (1959)' },
    { id: 'smalltalk', name: 'Smalltalk (1972)' },

    // C 语言家族
    { id: 'c', name: 'C (1972)' },
    { id: 'c++', name: 'C++ (1985)' },
    { id: 'java', name: 'Java (1995)' },
    { id: 'csharp', name: 'C# (2000)' },
    { id: 'go', name: 'Go (2009)' },
    { id: 'rust', name: 'Rust (2010)' },
    { id: 'zig', name: 'Zig (2016)' },

    // 脚本语言
    { id: 'perl', name: 'Perl (1987)' },
    { id: 'python', name: 'Python (1991)' },
    { id: 'ruby', name: 'Ruby (1995)' },
    { id: 'javascript', name: 'JavaScript (1995)' },
    { id: 'php', name: 'PHP (1995)' },
    { id: 'lua', name: 'Lua (1993)' },
    { id: 'r', name: 'R (1993)' },

    // 函数式语言
    { id: 'ml', name: 'ML (1973)' },
    { id: 'haskell', name: 'Haskell (1990)' },
    { id: 'erlang', name: 'Erlang (1986)' },
    { id: 'elixir', name: 'Elixir (2011)' },
    { id: 'clojure', name: 'Clojure (2007)' },
    { id: 'fsharp', name: 'F# (2005)' },
    { id: 'ocaml', name: 'OCaml (1996)' },

    // 冷门语言
    { id: 'prolog', name: 'Prolog (1972)' },
    { id: 'forth', name: 'Forth (1970)' },
    { id: 'ada', name: 'Ada (1980)' },
    { id: 'oberon', name: 'Oberon (1987)' },
    { id: 'nim', name: 'Nim (2008)' },
    { id: 'crystal', name: 'Crystal (2014)' },
    { id: 'vlang', name: 'V (2019)' },
    { id: 'julia', name: 'Julia (2012)' },
  ],
  links: [
    // ALGOL 系谱
    { source: 'algol', target: 'c' },
    { source: 'algol', target: 'pascal' },
    { source: 'algol', target: 'smalltalk' },

    // C 家族
    { source: 'c', target: 'c++' },
    { source: 'c++', target: 'java' },
    { source: 'java', target: 'csharp' },
    { source: 'java', target: 'scala' },
    { source: 'c', target: 'go' },
    { source: 'c', target: 'rust' },
    { source: 'c', target: 'zig' },

    // 脚本语言
    { source: 'smalltalk', target: 'ruby' },
    { source: 'ruby', target: 'crystal' },
    { source: 'c', target: 'javascript' },
    { source: 'javascript', target: 'typescript' },
    { source: 'perl', target: 'python' },
    { source: 'python', target: 'julia' },

    // 函数式
    { source: 'lisp', target: 'ml' },
    { source: 'ml', target: 'haskell' },
    { source: 'haskell', target: 'elixir' },
    { source: 'erlang', target: 'elixir' },
    { source: 'lisp', target: 'clojure' },

    // 冷门语言关系
    { source: 'smalltalk', target: 'self' },
    { source: 'prolog', target: 'mercury' },
    { source: 'oberon', target: 'nim' },
    { source: 'c++', target: 'vlang' },
  ],
}

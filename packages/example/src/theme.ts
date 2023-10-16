import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#5A32C2",
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          color: "white",
        },
        h3: {
          fontSize: 40,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: "52px",
        },
        h5: {
          fontSize: 28,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: "36px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 41,
          fontSize: 12,
          fontWeight: 500,
          padding: "6px 30px",
        },
        text: {
          color: "white",
        },
      },
    },
  },
  typography: {
    fontFamily: `"IBM Plex Sans","Roboto", "Helvetica", "Arial", sans-serif`,
  },
});

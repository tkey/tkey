import { FunctionComponent, Dispatch, SetStateAction } from "react";
import { Step, Stepper, StepLabel, StepIconProps } from "@mui/material";
import cn from "classnames/bind";
import styles from "./index.module.scss";

const cx = cn.bind(styles);
const steps = [
  {
    label: "Select campaign settings",
    description: `For each ad campaign that you create, you can control how much
              you're willing to spend on clicks and conversions, which networks
              and geographical locations you want your ads to show on, and more.`,
  },
  {
    label: "Create an ad group",
    description: "An ad group contains one or more ads which target a shared set of keywords.",
  },
  {
    label: "Create an ad",
    description: `Try out different ad text to see what brings in the most customers,
              and learn how to enhance your ads using features like ad extensions.
              If you run into any problems with your ads, find out how to tell if
              they're running and how to resolve approval issues.`,
  },
];

function StepIcon(props: StepIconProps) {
  const { className, icon } = props;

  return <div className={className}>{icon}</div>;
}

function StepConnector({ activeStep, index }: { activeStep: number; index: number }) {
  return (
    <div
      className={cx("stepperConnector", {
        active: activeStep >= index,
      })}
    />
  );
}

const VerticalStepper: FunctionComponent<{ activeStep: number }> = ({ activeStep }) => {
  return (
    <Stepper
      activeStep={activeStep}
      orientation="vertical"
      connector={<></>}
      classes={{
        root: styles.stepper,
      }}
    >
      {steps.map((step, index) => (
        <Step key={step.label}>
          {!!index && <StepConnector activeStep={activeStep} index={index} />}
          <StepLabel
            StepIconComponent={({ active, ...props }) => {
              return <StepIcon className={cx("stepperIcon", { active: activeStep >= index })} {...props} />;
            }}
          ></StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};

export default VerticalStepper;

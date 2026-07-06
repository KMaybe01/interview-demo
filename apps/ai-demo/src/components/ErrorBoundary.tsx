import { Button, Result } from "antd";
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<Result
					status="error"
					title="页面出现错误"
					subTitle={this.state.error?.message ?? "未知错误"}
					extra={
						<Button type="primary" onClick={this.handleReset}>
							重试
						</Button>
					}
				/>
			);
		}

		return this.props.children;
	}
}
